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
const messageChannel = new MessageChannel(); // MessageChannel을 생성하는 순간 port1과 port2는 이미 서로 연결된 한 쌍으로 만들어짐

// 브라우저 task queue를 이용해 렌더 작업을 잘게 나눠 실행한다.
messageChannel.port1.onmessage = performWorkUntilDeadline; // port2가 postMessage로 호출하면 post1에 저장된 performWorkUntilDeadline을 호출

// 외부에서 호출하는 렌더 진입점이다.
export function render(element: VNode, container: Element): FiberRoot {
  // container마다 하나의 FiberRoot를 유지한다.
  let root = roots.get(container);

  // 첫 렌더라면 루트를 새로 만든다.
  if (root === undefined) {
    root = createFiberRoot(container);
    roots.set(container, root);
  }

  // 이번 렌더 요청에서 사용할 최신 VNode를 updateQueue에 넣는다.
  root.current.updateQueue = [element];
  // 루트 업데이트를 예약하고 WIP 렌더를 시작할 준비를 한다.
  scheduleUpdateOnRoot(root);

  return root;
}

// 특정 container의 렌더 상태를 완전히 초기화한다.
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

// 현재 current 트리로부터 work-in-progress 트리를 만든 뒤 스케줄링한다.
export function scheduleUpdateOnRoot(root: FiberRoot): void {
  // current 트리를 복제해 이번 렌더용 WIP 트리를 만든다.
  const workInProgress = createWorkInProgress(root.current, root.current.props);

  // 이번 렌더에서 사용할 입력을 WIP에 전달한다.
  workInProgress.updateQueue = root.current.updateQueue;
  // 스케줄러가 이 루트부터 작업을 시작하도록 런타임 포인터를 맞춘다.
  fiberRuntime.workInProgressRoot = root;
  fiberRuntime.workInProgress = workInProgress;
  fiberRuntime.nextUnitOfWork = workInProgress;
  // 상태를 triggered로 바꾸고 host callback을 예약한다.
  setFiberStatus(root, FiberRenderState.Triggered);
  requestHostCallback();
}

// 남은 시간이 허용하는 동안만 unit of work를 반복 수행한다.
export function workLoop(): void {
  while (fiberRuntime.nextUnitOfWork !== null && shouldYield() === false) {
    fiberRuntime.nextUnitOfWork = performUnitOfWork(fiberRuntime.nextUnitOfWork);
  }
}

// 현재 task의 시간 예산을 다 썼는지 확인한다.
export function shouldYield(): boolean {
  return performance.now() >= fiberRuntime.renderDeadline;
}

// 이미 예약된 콜백이 없다면 다음 브라우저 task에 렌더를 등록한다.
function requestHostCallback(): void {
  if (fiberRuntime.isHostCallbackScheduled) {
    return;
  }

  fiberRuntime.isHostCallbackScheduled = true;
  messageChannel.port2.postMessage(undefined);
}

// 브라우저가 넘겨준 한 번의 task 안에서 render를 조금씩 진행한다.
function performWorkUntilDeadline(): void {
  const root = fiberRuntime.workInProgressRoot;

  // 예약된 host callback이 실행에 들어왔으므로 플래그를 해제한다.
  fiberRuntime.isHostCallbackScheduled = false;
  // 이번 task에서 사용할 시간 예산을 설정한다.
  fiberRuntime.renderDeadline = performance.now() + YIELD_INTERVAL_MS;

  // 예약 상태였던 루트를 실제 render 단계로 전환한다.
  if (root !== null && root.status === FiberRenderState.Triggered) {
    setFiberStatus(root, FiberRenderState.Render);
  }

  workLoop();

  // 아직 끝나지 않았다면 다음 task에서 이어서 실행한다.
  if (fiberRuntime.nextUnitOfWork !== null) {
    requestHostCallback(); 
    return;
  }

  // render가 끝났다면 commit 단계로 넘어간다.
  if (root !== null && fiberRuntime.workInProgress !== null) {
    setFiberStatus(root, FiberRenderState.Completed);
    commitRoot(root, fiberRuntime.workInProgress);
  }
}
