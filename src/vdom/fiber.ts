import type {
  ElementNodeKey,
  ElementNodeProps,
  ElementVNode,
} from './element-node.js';
import type { VNode } from './node.js';
import type { TextVNode } from './text-node.js';

export const ROOT_FIBER_TYPE = 'ROOT';
export const TEXT_FIBER_TYPE = '#text';
export const YIELD_INTERVAL_MS = 5;

export type FiberType = typeof ROOT_FIBER_TYPE | typeof TEXT_FIBER_TYPE | string;
export type FiberKey = ElementNodeKey;
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
  index: number;
  props: FiberProps;
  stateNode: Node | null;
  alternate: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  flags: FiberFlags;
  memoizedProps: FiberProps | null;
  updateQueue: FiberUpdateQueue | null;
  deletions: Fiber[] | null;
};

export type FiberRoot = {
  container: Element;
  current: Fiber;
  finishedWork: Fiber | null;
  status: FiberRenderState;
};

export type FiberRuntime = {
  nextUnitOfWork: Fiber | null;
  workInProgress: Fiber | null;
  workInProgressRoot: FiberRoot | null;
  renderDeadline: number;
  isHostCallbackScheduled: boolean;
};

export const fiberRuntime: FiberRuntime = {
  nextUnitOfWork: null,
  workInProgress: null,
  workInProgressRoot: null,
  renderDeadline: 0,
  isHostCallbackScheduled: false,
};

export function createFiber(
  type: FiberType,
  key: FiberKey,
  props: FiberProps,
  stateNode: Node | null,
): Fiber {
  return {
    type,
    key,
    index: 0,
    props,
    stateNode,
    alternate: null,
    child: null,
    sibling: null,
    return: null,
    flags: FiberFlags.NoFlags,
    memoizedProps: null,
    updateQueue: null,
    deletions: null,
  };
}

export function createFiberRoot(container: Element): FiberRoot {
  const hostRootFiber = createFiber(ROOT_FIBER_TYPE, null, {}, container);

  return {
    container,
    current: hostRootFiber,
    finishedWork: null,
    status: FiberRenderState.Idle,
  };
}

export function createWorkInProgress(
  current: Fiber,
  props: FiberProps,
): Fiber {
  let currentAlternate = current.alternate;

  if (currentAlternate === null) {
    currentAlternate = createFiber(
      current.type,
      current.key,
      props,
      current.stateNode,
    );
    currentAlternate.alternate = current;
    current.alternate = currentAlternate;
  } else {
    currentAlternate.type = current.type;
    currentAlternate.key = current.key;
    currentAlternate.index = current.index;
    currentAlternate.props = props;
    currentAlternate.stateNode = current.stateNode;
    currentAlternate.flags = FiberFlags.NoFlags;
    currentAlternate.memoizedProps = current.memoizedProps;
    currentAlternate.updateQueue = current.updateQueue;
    currentAlternate.deletions = null;
  }

  currentAlternate.child = null;
  currentAlternate.sibling = null;
  currentAlternate.return = null;

  return currentAlternate;
}

export function createFiberFromVNode(vNode: VNode): Fiber {
  return createFiber(
    getFiberTypeFromVNode(vNode),
    getFiberKeyFromVNode(vNode),
    getFiberPropsFromVNode(vNode),
    null,
  );
}

export function getFiberTypeFromVNode(vNode: VNode): FiberType {
  if (vNode.type === 'text') {
    return TEXT_FIBER_TYPE;
  }

  return vNode.tag;
}

export function getFiberPropsFromVNode(vNode: VNode): FiberProps {
  if (vNode.type === 'text') {
    return { nodeValue: vNode.value };
  }

  return vNode.props;
}

export function getFiberKeyFromVNode(vNode: VNode): FiberKey {
  if (vNode.type === 'text') {
    return null;
  }

  return vNode.key;
}

export function getChildElements(vNode: VNode): FiberUpdateQueue | null {
  if (vNode.type === 'text') {
    return null;
  }

  return vNode.children;
}

export function isSameFiberType(
  fiber: Fiber,
  nextNode: ElementVNode | TextVNode,
): boolean {
  return fiber.type === getFiberTypeFromVNode(nextNode);
}

export function hasSameFiberIdentity(
  fiber: Fiber,
  nextNode: ElementVNode | TextVNode,
): boolean {
  return (
    fiber.key === getFiberKeyFromVNode(nextNode)
    && isSameFiberType(fiber, nextNode)
  );
}

export function clearWorkInProgress(): void {
  fiberRuntime.nextUnitOfWork = null;
  fiberRuntime.workInProgress = null;
  fiberRuntime.workInProgressRoot = null;
  fiberRuntime.renderDeadline = 0;
}

export function prepareFreshStack(root: FiberRoot, workInProgress: Fiber): void {
  fiberRuntime.workInProgressRoot = root;
  fiberRuntime.workInProgress = workInProgress;
  fiberRuntime.nextUnitOfWork = workInProgress;
}

// 전체 이벤트 상태 관리
export function transitionRootState(
  root: FiberRoot,
  nextState: FiberRenderState,
): void {
  root.status = nextState;
}
