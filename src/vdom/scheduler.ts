import type { VNode } from './node.js';
import { commitRoot } from './dom.js';
import {
  emitFiberRenderSummary,
  createFiberRoot,
  createWorkInProgress,
  emitFiberWorkSlice,
  fiberRuntime,
  FiberRenderState,
  setFiberStatus,
  YIELD_INTERVAL_MS,
  type FiberRoot,
} from './fiber.js';
import { performUnitOfWork } from './reconciler.js';

/*
 * Fiber scheduler 전체 흐름
 * 1. render()가 새 VNode를 root.current.updateQueue에 넣는다.
 * 2. scheduleUpdateOnRoot()가 current를 기반으로 WIP를 만든다.
 * 3. MessageChannel이 다음 task에서 performWorkUntilDeadline()를 깨운다.
 * 4. performWorkUntilDeadline()가 5ms 동안 workLoop()를 돌린다.
 * 5. workLoop()는 Fiber를 하나씩 처리하다가 시간이 다 되면 멈춘다.
 * 6. nextUnitOfWork가 남아 있으면 다음 task에서 이어서 render를 재개한다.
 * 7. 다 끝나면 commitRoot()로 넘어가 실제 DOM 반영을 시작한다.
 */

// 같은 DOM container에 render를 여러 번 호출해도 같은 FiberRoot를 재사용한다.
const roots = new WeakMap<Element, FiberRoot>();
// root마다 이번 render가 몇 번째 5ms slice인지 기록한다.
const rootWorkSliceCounts = new WeakMap<FiberRoot, number>();
// root마다 이번 render에서 총 몇 개 Fiber를 처리했는지 기록한다.
const rootProcessedFiberCounts = new WeakMap<FiberRoot, number>();
// root마다 render phase에서 실제로 일한 시간을 누적한다.
const rootRenderElapsedTimes = new WeakMap<FiberRoot, number>();
// 브라우저 task queue에 "다음 render 일을 예약"하기 위해 MessageChannel을 쓴다.
const messageChannel = new MessageChannel();

// port2.postMessage()가 호출되면 나중에 port1.onmessage가 실행된다.
messageChannel.port1.onmessage = performWorkUntilDeadline;

// 외부에서 호출하는 렌더 진입점
export function render(element: VNode, container: Element): FiberRoot {
  // 순서 1.
  // 사용자가 "이 VNode를 이 DOM container에 그려라"라고 요청하는 첫 진입점이다.
  // "이 container를 누가 관리하고 있나?"를 조회한다.
  let root = roots.get(container);

  // 처음 렌더면 아직 root가 없으므로 새로 만든다.
  if (root === undefined) {
    root = createFiberRoot(container);
    roots.set(container, root);
  }
  // 이번 render에서 루트 아래에 그릴 새 VNode를 updateQueue에 담는다.
  root.current.updateQueue = [element];
  // 아직 바로 DOM을 바꾸지 않고, WIP 렌더를 시작할 준비만 한다.
  scheduleUpdateOnRoot(root);

  // 데모나 외부 코드가 root를 추적할 수 있게 반환한다.
  return root;
}

// 특정 container의 렌더 기록을 완전히 초기화한다.
// Reset 후 새 렌더가 "깨끗한 첫 렌더"처럼 시작되게 만들 때 쓴다.
export function resetRenderRoot(container: Element): void {
  const root = roots.get(container);

  // container -> FiberRoot 연결 제거
  roots.delete(container);
  if (root !== undefined) {
    rootWorkSliceCounts.delete(root);
    rootProcessedFiberCounts.delete(root);
    rootRenderElapsedTimes.delete(root);
  }

  // 만약 지금 진행 중인 render가 이 container였다면 runtime 책갈피도 함께 지운다.
  if (fiberRuntime.workInProgressRoot?.container === container) {
    fiberRuntime.nextUnitOfWork = null;
    fiberRuntime.workInProgress = null;
    fiberRuntime.workInProgressRoot = null;
    fiberRuntime.renderDeadline = 0;
    fiberRuntime.isHostCallbackScheduled = false;
  }
}

// "새 렌더를 실제로 돌 수 있는 상태"까지 준비한다.
export function scheduleUpdateOnRoot(root: FiberRoot): void {
  // 순서 2.
  // 아직 DOM은 안 건드리고, current를 기준으로 workInProgress 초안을 만든다.
  // current 화면 트리를 기준으로 WIP 복제본을 만든다.
  // 이 시점부터 current는 그대로 두고 WIP에서 새 계산을 시작한다.
  const workInProgress = createWorkInProgress(root.current, root.current.props);

  // render phase가 beginWork를 할 때 읽을 새 입력 VNode를 WIP 루트에 연결한다.
  workInProgress.updateQueue = root.current.updateQueue;
  // runtime 책갈피를 맞춰 "어느 root를, 어디서부터 처리할지"를 저장한다.
  fiberRuntime.workInProgressRoot = root;
  fiberRuntime.workInProgress = workInProgress;
  fiberRuntime.nextUnitOfWork = workInProgress;
  // 아직 render는 안 돌았고, 브라우저에 예약만 끝난 상태다.
  setFiberStatus(root, FiberRenderState.Triggered);
  // 새 render가 시작될 때 slice 카운트는 0부터 다시 센다.
  rootWorkSliceCounts.set(root, 0);
  rootProcessedFiberCounts.set(root, 0);
  rootRenderElapsedTimes.set(root, 0);
  // 다음 task에서 performWorkUntilDeadline가 돌도록 예약한다.
  requestHostCallback();
}

// render phase 메인 루프
export function workLoop(): number {
  let processedFibers = 0;

  // 순서 4.
  // "지금 당장 처리할 Fiber"를 하나 꺼내고, 그 다음 Fiber를 책갈피로 저장한다.
  // 1. 할 일이 남아 있고
  // 2. 아직 deadline 전이면
  // Fiber를 하나씩 계속 처리한다.
  while (fiberRuntime.nextUnitOfWork !== null && shouldYield() === false) {
    fiberRuntime.nextUnitOfWork = performUnitOfWork(fiberRuntime.nextUnitOfWork);
    processedFibers += 1;
  }

  return processedFibers;
}

// 이번 task에서 브라우저에 제어권을 넘겨야 할 시간인지 확인한다.
export function shouldYield(): boolean {
  return performance.now() >= fiberRuntime.renderDeadline;
}

// 브라우저 task queue에 "render work 다시 시작"을 예약한다.
function requestHostCallback(): void {
  // 이미 예약이 잡혀 있으면 중복 예약할 필요가 없다.
  if (fiberRuntime.isHostCallbackScheduled) {
    return;
  }
  // 예약됨 표시
  fiberRuntime.isHostCallbackScheduled = true;
  // port2에서 메시지를 보내면 브라우저가 task queue에 넣고,
  // 다음 턴에 port1.onmessage를 실행한다.
  messageChannel.port2.postMessage(undefined);
}

// 브라우저가 다음 task에서 실제로 호출하는 함수
function performWorkUntilDeadline(): void {
  // 순서 3.
  // MessageChannel이 깨우면 여기로 들어오고,
  // 여기서 이번 slice의 마감시간을 설정한 뒤 render를 조금 진행한다.
  // 지금 작업 중인 root를 가져온다.
  const root = fiberRuntime.workInProgressRoot;

  // 예약해둔 콜백이 실제로 실행됐으니 예약 플래그는 끈다.
  fiberRuntime.isHostCallbackScheduled = false;
  // "지금부터 5ms 뒤"를 이번 task의 종료 시각(deadline)으로 잡는다.
  fiberRuntime.renderDeadline = performance.now() + YIELD_INTERVAL_MS;

  // 예약만 된 상태였다면 이제 실제 render phase로 진입한다.
  if (root !== null && root.status === FiberRenderState.Triggered) {
    setFiberStatus(root, FiberRenderState.Render);
  }

  // 이번 task가 몇 번째 5ms render slice인지 증가시키고 로그 리스너에게 알린다.
  if (root !== null) {
    const nextSliceCount = (rootWorkSliceCounts.get(root) ?? 0) + 1;

    rootWorkSliceCounts.set(root, nextSliceCount);
  }

  const sliceStartedAt = performance.now();
  // 5ms 안에서 가능한 만큼 Fiber 작업을 진행한다.
  const processedFibers = workLoop();
  const sliceElapsedMs = performance.now() - sliceStartedAt;

  if (root !== null) {
    const sliceCount = rootWorkSliceCounts.get(root) ?? 0;
    const totalProcessedFibers = (rootProcessedFiberCounts.get(root) ?? 0) + processedFibers;
    const totalElapsedMs = (rootRenderElapsedTimes.get(root) ?? 0) + sliceElapsedMs;

    rootProcessedFiberCounts.set(root, totalProcessedFibers);
    rootRenderElapsedTimes.set(root, totalElapsedMs);
    emitFiberWorkSlice(root, {
      sliceCount,
      processedFibers,
      elapsedMs: sliceElapsedMs,
    });
  }

  // 아직 nextUnitOfWork가 남아 있으면 이번 턴은 여기서 멈춘다.
  // 그리고 다음 task에서 이어서 돌기 위해 다시 예약한다.
  if (fiberRuntime.nextUnitOfWork !== null) {
    requestHostCallback();
    return;
  }

  // render phase가 완전히 끝났다면 commit phase로 넘어간다.
  // 여기서부터 실제 DOM이 바뀐다.
  if (root !== null && fiberRuntime.workInProgress !== null) {
    // 순서 5.
    // render phase가 끝났으므로 이제 변경 계산 결과를 commit phase로 넘긴다.
    setFiberStatus(root, FiberRenderState.Completed);
    emitFiberRenderSummary(root, {
      sliceCount: rootWorkSliceCounts.get(root) ?? 0,
      processedFibers: rootProcessedFiberCounts.get(root) ?? 0,
      elapsedMs: rootRenderElapsedTimes.get(root) ?? 0,
    });
    commitRoot(root, fiberRuntime.workInProgress);
    rootWorkSliceCounts.delete(root);
    rootProcessedFiberCounts.delete(root);
    rootRenderElapsedTimes.delete(root);
  }
}
