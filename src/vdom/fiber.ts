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
    // 노드 타입
    type,
    // key 기반 재사용 판단용 identity
    key,
    // key가 없을 때 내부적으로 유지하는 안정적인 identity
    uid,
    // 형제 목록에서 현재 순서
    index: 0,
    // 현재 노드 props
    props,
    // 실제 DOM
    stateNode,
    // current <-> workInProgress 연결
    alternate: null,
    // linked list 기반 트리 포인터
    child: null,
    sibling: null,
    return: null,
    // commit phase에서 처리할 변경 종류
    flags: FiberFlags.NoFlags,
    // beginWork에서 사용할 자식 입력
    updateQueue: null,
    // 삭제 대상 목록
    deletions: null,
  };
}

export function createFiberRoot(container: Element): FiberRoot {
  // 실제 마운트 지점을 stateNode로 가지는 host root
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
    // 첫 렌더면 alternate를 새로 만든다.
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
    // 재렌더면 이전 WIP 객체를 재사용한다.
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

  // 새 렌더를 시작하므로 연결 포인터는 다시 채운다.
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
  root.status = status;

  for (const listener of fiberStatusListeners) {
    listener(root, status);
  }
}
