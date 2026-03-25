import type { VNode } from './node.js';
import {
  createFiber,
  FiberFlags,
  TEXT_FIBER_TYPE,
  ROOT_FIBER_TYPE,
  type Fiber,
  type FiberKey,
  type FiberProps,
  type FiberUid,
  type FiberUpdateQueue,
} from './fiber.js';
import { completeFiberNode } from './dom.js';
import { createWorkInProgress } from './fiber.js';

export function performUnitOfWork(fiber: Fiber): Fiber | null {
  // 현재 노드의 자식 방향 beginWork 수행
  const next = beginWork(fiber);

  // 자식이 생기면 먼저 내려간다.
  if (next !== null) {
    return next;
  }

  // 자식이 없으면 completeWork 후 형제/부모 쪽으로 이동한다.
  return completeUnitOfWork(fiber);
}

export function reconcileChildren(
  returnFiber: Fiber,
  elements: FiberUpdateQueue,
): void {
  // 이전 자식들을 key 또는 index 기준으로 찾기 쉽게 맵으로 만든다.
  const existingChildren = collectExistingChildren(
    returnFiber.alternate?.child ?? null,
  );
  let previousNewFiber: Fiber | null = null;
  let lastPlacedIndex = 0;

  // 새 child 연결은 이번 렌더에서 다시 만든다.
  returnFiber.child = null;
  returnFiber.deletions = null;

  elements.forEach((element, newIndex) => {
    const nextType = element.type === 'text' ? TEXT_FIBER_TYPE : element.tag;
    const nextKey = element.type === 'text' ? null : element.key;
    const nextUid = element.uid;
    // key가 있으면 key로, 없으면 내부 uid로 이전 자식을 찾는다.
    const lookupKey = createChildLookupKey(nextKey, nextUid);
    const matchedFiber = existingChildren.get(lookupKey) ?? null;
    const nextProps =
      element.type === 'text' ? { nodeValue: element.value } : element.props;
    const sameIdentity =
      matchedFiber !== null
      && matchedFiber.type === nextType
      && hasSameIdentity(matchedFiber, nextKey, nextUid);
    const newFiber =
      sameIdentity && matchedFiber !== null
        ? createWorkInProgress(matchedFiber, nextProps)
        : createFiber(
            nextType,
            nextKey,
            nextUid,
            nextProps,
            null,
          );

    if (matchedFiber !== null) {
      // 재사용한 이전 자식은 삭제 후보에서 뺀다.
      existingChildren.delete(createChildLookupKey(matchedFiber.key, matchedFiber.uid));
    }

    if (matchedFiber !== null && sameIdentity === false) {
      // key는 맞았지만 type이 다르면 이전 노드는 삭제한다.
      recordDeletion(returnFiber, matchedFiber);
    }

    // 새 Fiber를 linked list 구조에 연결한다.
    newFiber.return = returnFiber;
    newFiber.sibling = null;
    newFiber.index = newIndex;
    newFiber.updateQueue = element.type === 'text' ? null : element.children;

    if (sameIdentity && matchedFiber !== null) {
      // 이전 위치보다 앞으로 당겨졌으면 move가 필요하므로 Placement로 표시한다.
      if (matchedFiber.index < lastPlacedIndex) {
        newFiber.flags |= FiberFlags.Placement;
      } else {
        lastPlacedIndex = matchedFiber.index;
      }

      // 같은 노드라도 props가 바뀌면 Update로 표시한다.
      if (arePropsDifferent(matchedFiber.props, nextProps)) {
        newFiber.flags |= FiberFlags.Update;
      }
    } else {
      // 새로 생긴 노드는 DOM에 삽입해야 한다.
      newFiber.flags |= FiberFlags.Placement;
    }

    if (previousNewFiber === null) {
      returnFiber.child = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }

    previousNewFiber = newFiber;
  });

  // 재사용되지 못한 이전 자식은 모두 삭제 후보로 남긴다.
  for (const oldFiber of existingChildren.values()) {
    recordDeletion(returnFiber, oldFiber);
  }
}

function beginWork(fiber: Fiber): Fiber | null {
  // text는 자식이 없으니 바로 complete 단계로 넘어간다.
  if (fiber.type === TEXT_FIBER_TYPE) {
    return null;
  }

  // element/root는 새 자식 Fiber를 만든다.
  reconcileChildren(fiber, fiber.updateQueue ?? []);

  // DFS 순회이므로 자식부터 내려간다.
  return fiber.child;
}

function completeUnitOfWork(fiber: Fiber): Fiber | null {
  let currentFiber: Fiber | null = fiber;

  while (currentFiber !== null) {
    // 자식 처리가 끝난 노드를 마무리한다.
    completeWork(currentFiber);

    // 다음엔 형제로 이동한다.
    if (currentFiber.sibling !== null) {
      return currentFiber.sibling;
    }

    // 형제가 없으면 부모로 올라간다.
    currentFiber = currentFiber.return;
  }

  // 더 갈 곳이 없으면 render phase 종료다.
  return null;
}

function completeWork(fiber: Fiber): void {
  // root는 이미 실제 container를 stateNode로 가진다.
  if (fiber.type === ROOT_FIBER_TYPE) {
    return;
  }

  // host Fiber는 이 단계에서 실제 DOM 노드를 준비한다.
  completeFiberNode(fiber);
}

function collectExistingChildren(currentFirstChild: Fiber | null): Map<string, Fiber> {
  const existingChildren = new Map<string, Fiber>();
  let currentChild = currentFirstChild;
  let index = 0;

  while (currentChild !== null) {
    // 기존 순서를 저장해두면 move 판단에 쓸 수 있다.
    currentChild.index = index;
    existingChildren.set(
      createChildLookupKey(currentChild.key, currentChild.uid),
      currentChild,
    );
    currentChild = currentChild.sibling;
    index += 1;
  }

  return existingChildren;
}

function createChildLookupKey(key: FiberKey, uid: FiberUid): string {
  if (key !== null) {
    return `key:${key}`;
  }

  return `uid:${uid}`;
}

function hasSameIdentity(
  fiber: Fiber,
  key: FiberKey,
  uid: FiberUid,
): boolean {
  if (key !== null) {
    return fiber.key === key;
  }

  return fiber.key === null && fiber.uid === uid;
}

function recordDeletion(returnFiber: Fiber, fiber: Fiber): void {
  // commit phase에서 실제 DOM 삭제를 처리하도록 표시한다.
  fiber.flags |= FiberFlags.Deletion;
  returnFiber.deletions ??= [];
  returnFiber.deletions.push(fiber);
}

function arePropsDifferent(
  previousProps: FiberProps,
  nextProps: FiberProps,
): boolean {
  // key 수가 다르면 바로 다른 props다.
  const previousKeys = Object.keys(previousProps);
  const nextKeys = Object.keys(nextProps);

  if (previousKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of nextKeys) {
    // 같은 key라도 값이 다르면 Update가 필요하다.
    if (previousProps[key] !== nextProps[key]) {
      return true;
    }
  }

  return false;
}
