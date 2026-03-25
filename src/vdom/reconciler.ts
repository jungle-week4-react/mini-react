import {
  FiberFlags,
  ROOT_FIBER_TYPE,
  TEXT_FIBER_TYPE,
  type Fiber,
  type FiberKey,
  type FiberProps,
  type FiberUpdateQueue,
} from './fiber.js';
import {
  completeFiberNode,
} from './dom.js';
import {
  createFiberFromVNode,
  createWorkInProgress,
  getChildElements,
  getFiberKeyFromVNode,
  getFiberPropsFromVNode,
  hasSameFiberIdentity,
} from './fiber.js';

export function performUnitOfWork(fiber: Fiber): Fiber | null {
  const next = beginWork(fiber);

  fiber.memoizedProps = fiber.props;

  if (next !== null) {
    return next;
  }

  return completeUnitOfWork(fiber);
}

export function reconcileChildren(
  returnFiber: Fiber,
  elements: FiberUpdateQueue,
): void {
  const existingChildren = collectExistingChildren(
    returnFiber.alternate?.child ?? null,
  );
  let previousNewFiber: Fiber | null = null;
  let lastPlacedIndex = 0;

  returnFiber.child = null;
  returnFiber.deletions = null;

  elements.forEach((element, newIndex) => {
    const nextProps = getFiberPropsFromVNode(element);
    const matchedFiber =
      existingChildren.get(createChildLookupKey(getFiberKeyFromVNode(element), newIndex))
      ?? null;
    const sameIdentity =
      matchedFiber !== null && hasSameFiberIdentity(matchedFiber, element);
    const newFiber =
      sameIdentity && matchedFiber !== null
        ? createWorkInProgress(matchedFiber, nextProps)
        : createFiberFromVNode(element);

    if (matchedFiber !== null) {
      existingChildren.delete(createChildLookupKey(matchedFiber.key, matchedFiber.index));
    }

    if (matchedFiber !== null && sameIdentity === false) {
      recordDeletion(returnFiber, matchedFiber);
    }

    newFiber.return = returnFiber;
    newFiber.sibling = null;
    newFiber.index = newIndex;
    newFiber.updateQueue = getChildElements(element);

    if (sameIdentity && matchedFiber !== null) {
      if (matchedFiber.index < lastPlacedIndex) {
        newFiber.flags |= FiberFlags.Placement;
      } else {
        lastPlacedIndex = matchedFiber.index;
      }

      if (hasPropsChanged(matchedFiber, nextProps)) {
        newFiber.flags |= FiberFlags.Update;
      }
    } else {
      newFiber.flags |= FiberFlags.Placement;
    }

    if (previousNewFiber === null) {
      returnFiber.child = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }

    previousNewFiber = newFiber;
  });

  for (const oldFiber of existingChildren.values()) {
    recordDeletion(returnFiber, oldFiber);
  }
}

function beginWork(fiber: Fiber): Fiber | null {
  if (fiber.type === TEXT_FIBER_TYPE) {
    return null;
  }

  reconcileChildren(fiber, fiber.updateQueue ?? []);

  return fiber.child;
}

function completeUnitOfWork(fiber: Fiber): Fiber | null {
  let currentFiber: Fiber | null = fiber;

  while (currentFiber !== null) {
    completeWork(currentFiber);

    if (currentFiber.sibling !== null) {
      return currentFiber.sibling;
    }

    currentFiber = currentFiber.return;
  }

  return null;
}

function completeWork(fiber: Fiber): void {
  if (fiber.type === ROOT_FIBER_TYPE) {
    return;
  }

  completeFiberNode(fiber);
}

function collectExistingChildren(currentFirstChild: Fiber | null): Map<string, Fiber> {
  const existingChildren = new Map<string, Fiber>();
  let currentChild = currentFirstChild;
  let index = 0;

  while (currentChild !== null) {
    currentChild.index = index;
    existingChildren.set(createChildLookupKey(currentChild.key, index), currentChild);
    currentChild = currentChild.sibling;
    index += 1;
  }

  return existingChildren;
}

function createChildLookupKey(key: FiberKey, index: number): string {
  if (key !== null) {
    return `key:${key}`;
  }

  return `index:${index}`;
}

function recordDeletion(returnFiber: Fiber, fiber: Fiber): void {
  fiber.flags |= FiberFlags.Deletion;
  returnFiber.deletions ??= [];
  returnFiber.deletions.push(fiber);
}

function hasPropsChanged(fiber: Fiber, nextProps: FiberProps): boolean {
  const previousProps = fiber.memoizedProps ?? fiber.props;

  return arePropsDifferent(previousProps, nextProps);
}

function arePropsDifferent(
  previousProps: FiberProps,
  nextProps: FiberProps,
): boolean {
  const previousKeys = Object.keys(previousProps);
  const nextKeys = Object.keys(nextProps);

  if (previousKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of nextKeys) {
    if (previousProps[key] !== nextProps[key]) {
      return true;
    }
  }

  return false;
}
