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

// 한 개의 Fiber를 처리하고 다음에 방문할 Fiber를 반환한다.
export function performUnitOfWork(fiber: Fiber): Fiber | null {
  // 먼저 자식 방향으로 내려가며 다음 작업을 준비한다.
  const next = beginWork(fiber);

  // 자식이 있으면 깊이 우선 탐색을 계속한다.
  if (next !== null) {
    return next;
  }

  // 자식이 없으면 현재 노드를 마무리하고 형제/부모 쪽으로 이동한다.
  return completeUnitOfWork(fiber);
}

export function reconcileChildren(
  returnFiber: Fiber,
  elements: FiberUpdateQueue,
): void {
  // 이전 자식들을 key 또는 uid 기준으로 빠르게 찾을 수 있게 맵으로 만든다.
  const existingChildren = collectExistingChildren(
    returnFiber.alternate?.child ?? null,
  );
  let previousNewFiber: Fiber | null = null;
  let lastPlacedIndex = 0;

  // 자식 연결은 이번 렌더에서 다시 구성한다.
  returnFiber.child = null;
  returnFiber.deletions = null;

  elements.forEach((element, newIndex) => {
    const nextType = element.type === 'text' ? TEXT_FIBER_TYPE : element.tag;
    const nextKey = element.type === 'text' ? null : element.key;
    const nextUid = element.uid;
    // key가 있으면 key로, 없으면 uid로 이전 자식을 찾는다.
    const lookupKey = createChildLookupKey(nextKey, nextUid);
    const matchedFiber = existingChildren.get(lookupKey) ?? null; // 딕셔너리 children[lookupKey]로 찾기, 이전에 마운트된 Children 확인
    const nextProps =
      element.type === 'text' ? { "nodeValue": element.value } : element.props;
    const sameIdentity =
      matchedFiber !== null
      && matchedFiber.type === nextType
      && hasSameIdentity(matchedFiber, nextKey, nextUid); // Fiber 내부의 UID, Key와 UID, Key가 같은지 검사, True, False로 판단
    const newFiber =
      sameIdentity && matchedFiber !== null
        ? createWorkInProgress(matchedFiber, nextProps) // 같으면 다음 props로 덮어씌워
        : createFiber(  // 이전 Fiber를 key로 못찾은 경우, Next Fiber와 다른 경우?
            nextType,
            nextKey,
            nextUid,
            nextProps,
            null,
          );

    if (matchedFiber !== null) {
      // 재사용 여부와 무관하게 한 번 매칭된 old Fiber는 후보군에서 제거한다.
      existingChildren.delete(createChildLookupKey(matchedFiber.key, matchedFiber.uid));
    }

    if (matchedFiber !== null && sameIdentity === false) {
      // key는 같아도 타입이 바뀌면 기존 DOM을 재사용할 수 없으므로 삭제 처리한다.
      recordDeletion(returnFiber, matchedFiber);
    }

    // 새 자식 Fiber들을 형제 연결 리스트로 이어 붙인다.
    newFiber.return = returnFiber;
    newFiber.sibling = null;
    newFiber.index = newIndex;
    newFiber.updateQueue = element.type === 'text' ? null : element.children;

    if (sameIdentity && matchedFiber !== null) {
      // 이전 위치보다 앞으로 당겨졌다면 실제 DOM 이동이 필요하다.
      if (matchedFiber.index < lastPlacedIndex) {
        newFiber.flags |= FiberFlags.Placement;
      } else {
        lastPlacedIndex = matchedFiber.index;
      }

      // 같은 노드라도 props가 달라졌다면 속성 업데이트가 필요하다.
      if (arePropsDifferent(matchedFiber.props, nextProps)) {
        newFiber.flags |= FiberFlags.Update;
      }
    } else {
      // 새로 생긴 노드는 commit 단계에서 DOM에 삽입해야 한다.
      newFiber.flags |= FiberFlags.Placement;
    }

    if (previousNewFiber === null) {
      returnFiber.child = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }

    previousNewFiber = newFiber;
  });

  // 끝까지 재사용되지 못한 이전 자식들은 모두 삭제 대상으로 남긴다.
  for (const oldFiber of existingChildren.values()) {
    recordDeletion(returnFiber, oldFiber);
  }
}

function beginWork(fiber: Fiber): Fiber | null {
  // 텍스트 노드는 자식이 없으므로 바로 complete 단계로 넘어간다.
  if (fiber.type === TEXT_FIBER_TYPE) {
    return null;
  }

  // element/root는 updateQueue를 바탕으로 자식 Fiber를 만든다.
  reconcileChildren(fiber, fiber.updateQueue ?? []);

  // 깊이 우선 순회이므로 먼저 첫 번째 자식으로 내려간다.
  return fiber.child;
}

function completeUnitOfWork(fiber: Fiber): Fiber | null {
  let currentFiber: Fiber | null = fiber;

  while (currentFiber !== null) {
    // 자식 처리가 끝난 노드를 하나씩 마무리한다.
    completeWork(currentFiber);

    // 다음 형제가 있으면 그쪽으로 이동한다.
    if (currentFiber.sibling !== null) {
      return currentFiber.sibling;
    }

    // 형제가 없으면 부모로 올라가며 complete 단계를 이어간다.
    currentFiber = currentFiber.return;
  }

  // 더 방문할 곳이 없으면 render 단계가 끝난다.
  return null;
}

function completeWork(fiber: Fiber): void {
  // root는 이미 container를 stateNode로 들고 있으므로 건너뛴다.
  if (fiber.type === ROOT_FIBER_TYPE) {
    return;
  }

  // host Fiber는 complete 단계에서 실제 DOM 노드를 준비한다.
  completeFiberNode(fiber);
}

function collectExistingChildren(currentFirstChild: Fiber | null): Map<string, Fiber> {
  const existingChildren = new Map<string, Fiber>();
  let currentChild = currentFirstChild;
  let index = 0;

  while (currentChild !== null) {
    // 기존 순서를 기억해야 이동 여부를 판단할 수 있다.
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
  // commit 단계에서 실제 DOM 삭제가 일어나도록 부모 Fiber에 기록한다.
  fiber.flags |= FiberFlags.Deletion;
  returnFiber.deletions ??= [];
  returnFiber.deletions.push(fiber);
}

function arePropsDifferent(
  previousProps: FiberProps,
  nextProps: FiberProps,
): boolean {
  // 속성 개수가 다르면 곧바로 변경으로 판단한다.
  const previousKeys = Object.keys(previousProps);
  const nextKeys = Object.keys(nextProps);

  if (previousKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of nextKeys) {
    // 같은 key라도 값이 달라지면 Update가 필요하다.
    if (previousProps[key] !== nextProps[key]) {
      return true;
    }
  }

  return false;
}
