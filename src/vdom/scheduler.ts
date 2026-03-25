import type { VNode } from './node.js';
import { commitRoot } from './dom.js';
import {
  createFiberRoot,
  createWorkInProgress,
  fiberRuntime,
  FiberRenderState,
  setFiberStatus,
  YIELD_INTERVAL_MS,
  type FiberRoot,
} from './fiber.js';
import { performUnitOfWork } from './reconciler.js';

const roots = new WeakMap<Element, FiberRoot>();
const messageChannel = new MessageChannel();

// MessageChannel.port1 콜백 등록
messageChannel.port1.onmessage = performWorkUntilDeadline;

// 렌더 요청
export function render(element: VNode, container: Element): FiberRoot {
  // 컨테이너를 관리하는 루트
  let root = roots.get(container);

  // 처음 렌더라면 새 루트 생성
  if (root === undefined) {
    root = createFiberRoot(container);
    roots.set(container, root);
  }
  // 이번 렌더 요청에서 사용할 새 VNode를 루트 등록
  root.current.updateQueue = [element];
  // 루트 업데이트를 예약하고 WIP 렌더를 시작할 준비
  scheduleUpdateOnRoot(root);

  // 루트 반환
  return root;
}

// 특정 container의 렌더 상태를 완전히 초기화
export function resetRenderRoot(container: Element): void {
  roots.delete(container);

  if (fiberRuntime.workInProgressRoot?.container === container) {
    fiberRuntime.nextUnitOfWork = null;
    fiberRuntime.workInProgress = null;
    fiberRuntime.workInProgressRoot = null;
    fiberRuntime.renderDeadline = 0;
    fiberRuntime.isHostCallbackScheduled = false;
  }
}

// WIP 렌더를 시작할 준비
export function scheduleUpdateOnRoot(root: FiberRoot): void {
  // 현재 트리 기준 새 WIP 트리 생성 (fork)
  const workInProgress = createWorkInProgress(root.current, root.current.props);

  // 렌더에서 사용할 업데이트 입력 (예약된 작업)
  workInProgress.updateQueue = root.current.updateQueue;
  // 렌더 루프가 이 WIP부터 시작하도록 책갈피를 맞춘다.
  fiberRuntime.workInProgressRoot = root;
  fiberRuntime.workInProgress = workInProgress;
  fiberRuntime.nextUnitOfWork = workInProgress;
  // 업데이트가 예약된 상태로 변경
  setFiberStatus(root, FiberRenderState.Triggered);
  // MessageChannel.port2 콜백 예약
  requestHostCallback();
}

// 반복 작업
export function workLoop(): void {
  // 할당된 시간까지 작업 반복
  while (fiberRuntime.nextUnitOfWork !== null && shouldYield() === false) {
    fiberRuntime.nextUnitOfWork = performUnitOfWork(fiberRuntime.nextUnitOfWork);
  }
}
// 이번 task에 작업할 시간 체크
export function shouldYield(): boolean {
  return performance.now() >= fiberRuntime.renderDeadline;
}
// MessageChannel.port2 콜백 예약
function requestHostCallback(): void {
  // 이미 예약된 상태면 리턴
  if (fiberRuntime.isHostCallbackScheduled) {
    return;
  }
  // 예약 상태로 변경
  fiberRuntime.isHostCallbackScheduled = true;
  // 브라우저에 task queue에 등록 -> 브라우저가 messageChannel.port1에 등록된 메서드를 콜백
  messageChannel.port2.postMessage(undefined);
}

// 메인 루프
function performWorkUntilDeadline(): void {
  // 현재 작업 중인 루트
  const root = fiberRuntime.workInProgressRoot;

  // 예약해둔 host callback은 이제 실행 중이므로 예약 플래그 갱신
  fiberRuntime.isHostCallbackScheduled = false;
  // 이번 task에 작업할 시간 설정, 기준 시간 + 5
  fiberRuntime.renderDeadline = performance.now() + YIELD_INTERVAL_MS;

  // 요청을 수집하는 상태를 끝내고 render phase를 시작
  if (root !== null && root.status === FiberRenderState.Triggered) {
    setFiberStatus(root, FiberRenderState.Render);
  }

  // 할당된 시간까지 작업 반복
  workLoop();

  // 다음 작업이 남아 있으면 콜백 함수 예약
  if (fiberRuntime.nextUnitOfWork !== null) {
    requestHostCallback();
    return;
  }
  // 작업 상태를 끝내고 commit 시작
  if (root !== null && fiberRuntime.workInProgress !== null) {
    setFiberStatus(root, FiberRenderState.Completed);
    commitRoot(root, fiberRuntime.workInProgress);
  }
}
