import type {
  ElementNodeKey,
  ElementNodeProps,
  ElementNodeUid,
} from './element-node.js';
import type { VNode } from './node.js';

export const ROOT_FIBER_TYPE = 'ROOT';
export const TEXT_FIBER_TYPE = '#text';
export const YIELD_INTERVAL_MS = 5;

export type FiberType = typeof ROOT_FIBER_TYPE | typeof TEXT_FIBER_TYPE | string;
export type FiberKey = ElementNodeKey;
export type FiberUid = ElementNodeUid;
export type FiberProps = ElementNodeProps;
export type FiberUpdateQueue = VNode[];

export enum FiberFlags {
  NoFlags = 0,
  Placement = 1 << 0,
  Update = 1 << 1,
  Deletion = 1 << 2,
}

export enum FiberRenderState {
  Idle = 'idle',
  Triggered = 'triggered',
  Render = 'render',
  Completed = 'completed',
  Commit = 'commit',
}

export type Fiber = {
  type: FiberType;
  key: FiberKey;
  uid: FiberUid;
  index: number;
  props: FiberProps;
  stateNode: Node | null;
  alternate: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  flags: FiberFlags;
  updateQueue: FiberUpdateQueue | null;
  deletions: Fiber[] | null;
};

export type FiberRoot = {
  container: Element;
  current: Fiber;
  status: FiberRenderState;
};

export type FiberRuntime = {
  nextUnitOfWork: Fiber | null;
  workInProgress: Fiber | null;
  workInProgressRoot: FiberRoot | null;
  renderDeadline: number;
  isHostCallbackScheduled: boolean;
};

export type FiberStatusListener = (
  root: FiberRoot,
  status: FiberRenderState,
) => void;

// 현재 스케줄러가 처리 중인 작업 상태를 전역으로 관리한다.
export const fiberRuntime: FiberRuntime = {
  nextUnitOfWork: null,
  workInProgress: null,
  workInProgressRoot: null,
  renderDeadline: 0,
  isHostCallbackScheduled: false,
};

const fiberStatusListeners = new Set<FiberStatusListener>();

export function createFiber(
  type: FiberType,
  key: FiberKey,
  uid: FiberUid,
  props: FiberProps,
  stateNode: Node | null,
): Fiber {
  return {
    // 현재 Fiber가 표현하는 노드 타입
    type,
    // key 기반 diff에 사용하는 식별자
    key,
    // key가 없을 때 사용하는 보조 식별자
    uid,
    // 형제 목록 안에서의 현재 순서
    index: 0,
    // 현재 Fiber가 반영해야 할 props
    props,
    // 연결된 실제 DOM 노드
    stateNode,
    // current와 workInProgress를 잇는 포인터
    alternate: null,
    // Fiber 트리를 연결 리스트 형태로 구성한다.
    child: null,
    sibling: null,
    return: null,
    // commit 단계에서 반영할 변경 종류
    flags: FiberFlags.NoFlags,
    // beginWork에서 자식 Fiber를 만들 때 사용할 입력
    updateQueue: null,
    // 삭제 대상 자식 목록
    deletions: null,
  };
}

export function createFiberRoot(container: Element): FiberRoot {
  // 실제 마운트 지점을 stateNode로 가지는 host root Fiber를 만든다.
  const hostRootFiber = createFiber(ROOT_FIBER_TYPE, null, 'root', {}, container);

  return {
    container,
    current: hostRootFiber,
    status: FiberRenderState.Idle,
  };
}

export function createWorkInProgress(
  current: Fiber,
  props: FiberProps,
): Fiber {
  let currentAlternate = current.alternate;

  if (currentAlternate === null) {
    // 첫 렌더에서는 alternate를 새로 만들어 current와 짝을 맞춘다.
    currentAlternate = createFiber(
      current.type,
      current.key,
      current.uid,
      props,
      current.stateNode,
    );
    currentAlternate.alternate = current;
    current.alternate = currentAlternate;
  } else {
    // 이후 렌더에서는 기존 WIP 객체를 재사용하면서 값만 갱신한다.
    currentAlternate.type = current.type;
    currentAlternate.key = current.key;
    currentAlternate.uid = current.uid;
    currentAlternate.index = current.index;
    currentAlternate.props = props;
    currentAlternate.stateNode = current.stateNode;
    currentAlternate.flags = FiberFlags.NoFlags;
    currentAlternate.updateQueue = current.updateQueue;
    currentAlternate.deletions = null;
  }

  // 새 렌더를 시작하므로 트리 연결 정보는 다시 채운다.
  currentAlternate.child = null;
  currentAlternate.sibling = null;
  currentAlternate.return = null;

  return currentAlternate;
}

export function subscribeFiberStatus(
  listener: FiberStatusListener,
): () => void {
  fiberStatusListeners.add(listener);

  return () => {
    fiberStatusListeners.delete(listener);
  };
}

export function setFiberStatus(
  root: FiberRoot,
  status: FiberRenderState,
): void {
  // 데모 UI가 렌더링 단계를 시각화할 수 있도록 상태 변화를 방송한다.
  root.status = status;

  for (const listener of fiberStatusListeners) {
    listener(root, status);
  }
}
