import {
  clearWorkInProgress,
  fiberRuntime,
  FiberFlags,
  FiberRenderState,
  ROOT_FIBER_TYPE,
  TEXT_FIBER_TYPE,
  transitionRootState,
  type Fiber,
  type FiberProps,
  type FiberRoot,
} from './fiber.js';

const EMPTY_PROPS: FiberProps = {};
const TEXT_CONTENT_PROP = 'nodeValue';

export function commitRoot(
  root: FiberRoot | null = fiberRuntime.workInProgressRoot,
  finishedWork: Fiber | null = fiberRuntime.workInProgress,
): void {
  if (root === null || finishedWork === null) {
    return;
  }

  transitionRootState(root, FiberRenderState.Commit);
  root.finishedWork = finishedWork;
  commitMutationEffects(finishedWork);
  root.current = finishedWork;
  root.finishedWork = null;
  clearWorkInProgress();
  transitionRootState(root, FiberRenderState.Idle);
}

export function completeFiberNode(fiber: Fiber): void {
  if (fiber.type === ROOT_FIBER_TYPE || fiber.stateNode !== null) {
    return;
  }

  fiber.stateNode = createStateNode(fiber);
}

export function commitPlacement(fiber: Fiber): void {
  if (fiber.type === ROOT_FIBER_TYPE || fiber.stateNode === null) {
    return;
  }

  const hostParent = getHostParentNode(fiber);
  const hostSibling = getHostSibling(fiber);

  if (hostParent === null) {
    return;
  }

  if (hostSibling === null) {
    hostParent.appendChild(fiber.stateNode);
    return;
  }

  hostParent.insertBefore(fiber.stateNode, hostSibling);
}

export function commitUpdate(fiber: Fiber): void {
  if (fiber.stateNode === null || fiber.alternate === null) {
    return;
  }

  const previousProps = fiber.alternate.memoizedProps ?? fiber.alternate.props;
  updateStateNode(fiber.stateNode, previousProps, fiber.props);
}

export function commitDeletion(fiber: Fiber, hostParent: Node): void {
  if (fiber.stateNode !== null && fiber.type !== ROOT_FIBER_TYPE) {
    if (fiber.stateNode.parentNode === hostParent) {
      hostParent.removeChild(fiber.stateNode);
    }

    return;
  }

  let child = fiber.child;

  while (child !== null) {
    commitDeletion(child, hostParent);
    child = child.sibling;
  }
}

export function getHostChildrenParentNode(fiber: Fiber): Node | null {
  if (fiber.stateNode !== null && fiber.type !== TEXT_FIBER_TYPE) {
    return fiber.stateNode;
  }

  return getHostParentNode(fiber);
}

function commitMutationEffects(fiber: Fiber | null): void {
  let currentFiber = fiber;

  while (currentFiber !== null) {
    commitMutationEffectOnFiber(currentFiber);

    if (currentFiber.child !== null) {
      currentFiber = currentFiber.child;
      continue;
    }

    while (currentFiber !== null) {
      if (currentFiber.sibling !== null) {
        currentFiber = currentFiber.sibling;
        break;
      }

      currentFiber = currentFiber.return;
    }
  }
}

function commitMutationEffectOnFiber(fiber: Fiber): void {
  const hostChildrenParent = getHostChildrenParentNode(fiber);

  if (fiber.deletions !== null && hostChildrenParent !== null) {
    for (const deletion of fiber.deletions) {
      commitDeletion(deletion, hostChildrenParent);
    }
  }

  if ((fiber.flags & FiberFlags.Placement) !== 0) {
    commitPlacement(fiber);
  }

  if ((fiber.flags & FiberFlags.Update) !== 0) {
    commitUpdate(fiber);
  }

  fiber.flags = FiberFlags.NoFlags;
  fiber.deletions = null;
}

function createStateNode(fiber: Fiber): Node {
  const ownerDocument = getOwnerDocument(fiber);

  if (fiber.type === TEXT_FIBER_TYPE) {
    return ownerDocument.createTextNode(fiber.props[TEXT_CONTENT_PROP] ?? '');
  }

  const element = ownerDocument.createElement(fiber.type);

  updateElementProps(element, EMPTY_PROPS, fiber.props);

  return element;
}

function getHostParentNode(fiber: Fiber): Node | null {
  let parent = fiber.return;

  while (parent !== null) {
    if (parent.stateNode !== null && parent.type !== TEXT_FIBER_TYPE) {
      return parent.stateNode;
    }

    parent = parent.return;
  }

  return null;
}

function getHostSibling(fiber: Fiber): Node | null {
  let sibling = fiber.sibling;

  while (sibling !== null) {
    if (
      sibling.stateNode !== null
      && (sibling.flags & FiberFlags.Placement) === 0
    ) {
      return sibling.stateNode;
    }

    sibling = sibling.sibling;
  }

  return null;
}

function getOwnerDocument(fiber: Fiber): Document {
  let current: Fiber | null = fiber.return;

  while (current !== null) {
    if (current.stateNode !== null) {
      return current.stateNode.ownerDocument ?? document;
    }

    current = current.return;
  }

  return document;
}

function updateStateNode(
  stateNode: Node,
  previousProps: FiberProps,
  nextProps: FiberProps,
): void {
  if (stateNode instanceof Text) {
    const nextValue = nextProps[TEXT_CONTENT_PROP] ?? '';

    if (stateNode.nodeValue !== nextValue) {
      stateNode.nodeValue = nextValue;
    }

    return;
  }

  if (stateNode instanceof Element) {
    updateElementProps(stateNode, previousProps, nextProps);
  }
}

function updateElementProps(
  element: Element,
  previousProps: FiberProps,
  nextProps: FiberProps,
): void {
  for (const key of Object.keys(previousProps)) {
    if (key in nextProps === false) {
      element.removeAttribute(key);
    }
  }

  for (const [key, value] of Object.entries(nextProps)) {
    if (previousProps[key] !== value) {
      element.setAttribute(key, value);
    }
  }
}
