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

/*
 * reconciler 전체 흐름
 * 1. performUnitOfWork()가 Fiber 하나를 꺼낸다.
 * 2. beginWork()에서 현재 Fiber의 자식 VNode를 새 Fiber로 바꾼다.
 * 3. reconcileChildren()가 old Fiber와 new VNode를 비교해 flags를 꽂는다.
 * 4. 자식이 있으면 자식으로 내려가고, 없으면 completeUnitOfWork()로 올라간다.
 * 5. completeWork()에서 필요한 실제 DOM 노드를 미리 만들어 둔다.
 * 6. 이 단계에서는 DOM에 붙이지 않고, commit phase까지 결과만 모아둔다.
 */

// performUnitOfWork는 Fiber 하나를 처리하고
// "다음에 어느 Fiber를 처리할지"를 반환한다.
export function performUnitOfWork(fiber: Fiber): Fiber | null {
  // 순서 1.
  // 지금 이 Fiber 하나를 처리하고, 그 다음 Fiber 위치를 반환한다.
  // beginWork는 현재 노드 기준으로 자식 Fiber를 준비하는 단계다.
  const next = beginWork(fiber);

  // 자식이 있으면 DFS 규칙에 따라 자식부터 처리한다.
  if (next !== null) {
    return next;
  }

  // 자식이 없으면 이 노드를 completeWork로 마무리한 뒤
  // 형제 또는 부모 쪽으로 올라가 다음 작업을 찾는다.
  return completeUnitOfWork(fiber);
}

// reconcileChildren는 "이전 Fiber 자식 목록"과 "새 VNode 자식 목록"을 비교해서
// 새 child Fiber linked list를 만드는 핵심 diff 함수다.
export function reconcileChildren(
  returnFiber: Fiber,
  elements: FiberUpdateQueue,
): void {
  // 순서 2.
  // 현재 부모(returnFiber) 아래의 "이전 자식 목록"과 "새 자식 목록"을 비교한다.
  // 이 함수가 Diff의 핵심이다.
  // alternate.child는 "이전 화면(current)의 첫 번째 자식"이다.
  // 비교를 빠르게 하기 위해 key/uid 기준 Map으로 바꿔둔다.
  const existingChildren = collectExistingChildren(
    returnFiber.alternate?.child ?? null,
  );
  // 이전에 만든 새 Fiber를 기억해둬야 sibling 연결을 할 수 있다.
  let previousNewFiber: Fiber | null = null;
  // 마지막으로 제자리에 있었던 old index를 기억하면
  // "앞으로 당겨졌는지"를 보고 move(Placement) 여부를 판별할 수 있다.
  let lastPlacedIndex = 0;

  // 이번 렌더에서 child linked list는 처음부터 다시 만든다.
  returnFiber.child = null;
  // 삭제 목록도 이번 렌더에서 다시 모은다.
  returnFiber.deletions = null;

  elements.forEach((element, newIndex) => {
    // 순서 3-1.
    // 새 VNode 하나를 꺼내서 old Fiber와 같은 identity인지 판단한다.
    // 새 VNode를 Fiber 관점에서 비교 가능한 값들로 펼친다.
    const nextType = element.type === 'text' ? TEXT_FIBER_TYPE : element.tag;
    const nextKey = element.type === 'text' ? null : element.key;
    const nextUid = element.uid;
    // key가 있으면 key가 우선이고, 없으면 내부 uid를 fallback으로 쓴다.
    const lookupKey = createChildLookupKey(nextKey, nextUid);
    // 이전 자식 목록에서 "같은 후보"를 먼저 찾는다.
    const matchedFiber = existingChildren.get(lookupKey) ?? null;
    // text와 element는 props 구조가 조금 달라서 여기서 통일해둔다.
    const nextProps =
      element.type === 'text' ? { nodeValue: element.value } : element.props;
    // "정말 같은 노드인가?"를 type + key/uid로 다시 확인한다.
    const sameIdentity =
      matchedFiber !== null
      && matchedFiber.type === nextType
      && hasSameIdentity(matchedFiber, nextKey, nextUid);
    // 같은 노드면 기존 Fiber의 alternate(WIP)를 재사용하고,
    // 아니면 완전히 새 Fiber를 만든다.
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
      // 이미 사용한 old Fiber는 Map에서 빼야
      // 마지막에 "재사용 안 된 old Fiber = 삭제 대상"을 올바르게 계산할 수 있다.
      existingChildren.delete(createChildLookupKey(matchedFiber.key, matchedFiber.uid));
    }

    if (matchedFiber !== null && sameIdentity === false) {
      // lookupKey는 같았지만 type이 다르면 같은 노드가 아니라 교체다.
      // old DOM은 삭제하고 new DOM은 새로 만든다.
      recordDeletion(returnFiber, matchedFiber);
    }

    // 새 Fiber를 parent/child/sibling 구조에 연결한다.
    newFiber.return = returnFiber;
    newFiber.sibling = null;
    newFiber.index = newIndex;
    // element라면 다음 beginWork가 다시 이 children을 읽어 자식 Fiber를 만들 수 있게 한다.
    newFiber.updateQueue = element.type === 'text' ? null : element.children;

    if (sameIdentity && matchedFiber !== null) {
      // 순서 3-2.
      // 같은 노드라고 판단되면 기존 DOM/Fiber를 재사용하되,
      // 이동 또는 속성 변경이 필요한지 flags로 표시만 한다.
      // old index보다 더 앞자리로 당겨졌다면 DOM 이동이 필요하다.
      if (matchedFiber.index < lastPlacedIndex) {
        newFiber.flags |= FiberFlags.Placement;
      } else {
        // 아직 순서가 잘 유지됐다면 "마지막 안정 위치"를 갱신한다.
        lastPlacedIndex = matchedFiber.index;
      }

      // 같은 DOM 노드라도 속성/텍스트가 바뀌면 Update가 필요하다.
      if (arePropsDifferent(matchedFiber.props, nextProps)) {
        newFiber.flags |= FiberFlags.Update;
      }
    } else {
      // 순서 3-3.
      // 이전에 없던 새 노드면 commit에서 삽입해야 하므로 Placement를 남긴다.
      // 이전에 없던 완전 새 노드는 삽입이 필요하다.
      newFiber.flags |= FiberFlags.Placement;
    }

    // child -> sibling linked list 연결
    if (previousNewFiber === null) {
      returnFiber.child = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }

    previousNewFiber = newFiber;
  });

  // 끝까지 Map에 남은 old Fiber는 새 목록 어디에도 매칭되지 못한 노드다.
  // 따라서 삭제 대상이다.
  for (const oldFiber of existingChildren.values()) {
    recordDeletion(returnFiber, oldFiber);
  }
}

function beginWork(fiber: Fiber): Fiber | null {
  // 순서 2의 실제 진입점.
  // 이 Fiber가 들고 있던 updateQueue(children)를 기준으로 자식 Fiber를 만든다.
  // text node는 자식이 없으므로 더 내려갈 곳이 없다.
  if (fiber.type === TEXT_FIBER_TYPE) {
    return null;
  }

  // element/root는 updateQueue에 담긴 자식 VNode를 Fiber로 바꾼다.
  reconcileChildren(fiber, fiber.updateQueue ?? []);

  // DFS 규칙: 자식이 있으면 자식부터 내려간다.
  return fiber.child;
}

function completeUnitOfWork(fiber: Fiber): Fiber | null {
  let currentFiber: Fiber | null = fiber;

  while (currentFiber !== null) {
    // 순서 4.
    // 자식 처리가 끝난 노드부터 completeWork를 호출하면서
    // 형제가 있으면 형제로, 없으면 부모로 올라간다.
    // beginWork로 자식 연결을 다 끝냈다면, 이제 자기 자신을 complete한다.
    completeWork(currentFiber);

    // 형제가 있으면 부모로 올라가지 말고 같은 depth의 형제로 간다.
    if (currentFiber.sibling !== null) {
      return currentFiber.sibling;
    }

    // 형제도 없으면 한 단계 위 부모로 올라가서 다시 형제를 찾는다.
    currentFiber = currentFiber.return;
  }

  // 루트까지 다 올라왔으면 render phase가 끝난 것이다.
  return null;
}

function completeWork(fiber: Fiber): void {
  // 순서 5.
  // 여기서는 실제 DOM 노드를 "준비"만 하고 아직 live DOM에 붙이지 않는다.
  // ROOT는 이미 container DOM을 알고 있으므로 따로 만들 일이 없다.
  if (fiber.type === ROOT_FIBER_TYPE) {
    return;
  }

  // 실제 DOM 노드 생성은 complete 단계에서 한 번만 해둔다.
  // 아직 화면에 붙이지는 않고, commit에서 붙인다.
  completeFiberNode(fiber);
}

function collectExistingChildren(currentFirstChild: Fiber | null): Map<string, Fiber> {
  const existingChildren = new Map<string, Fiber>();
  let currentChild = currentFirstChild;
  let index = 0;

  while (currentChild !== null) {
    // old child의 원래 순서를 저장해둬야 이후 "이동이 필요한가?"를 계산할 수 있다.
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
  // key가 있으면 key가 identity 우선권을 가진다.
  if (key !== null) {
    return `key:${key}`;
  }

  // key가 없다면 내부 uid를 fallback identity로 사용한다.
  return `uid:${uid}`;
}

function hasSameIdentity(
  fiber: Fiber,
  key: FiberKey,
  uid: FiberUid,
): boolean {
  // 개발자가 key를 줬다면 key가 같아야 같은 노드다.
  if (key !== null) {
    return fiber.key === key;
  }

  // key가 없다면 "둘 다 key가 없고 uid가 같아야" 같은 노드다.
  return fiber.key === null && fiber.uid === uid;
}

function recordDeletion(returnFiber: Fiber, fiber: Fiber): void {
  // 삭제는 자식 자신이 아니라 부모 Fiber.deletions에 모아두는 편이 commit에서 처리하기 쉽다.
  fiber.flags |= FiberFlags.Deletion;
  returnFiber.deletions ??= [];
  returnFiber.deletions.push(fiber);
}

function arePropsDifferent(
  previousProps: FiberProps,
  nextProps: FiberProps,
): boolean {
  // props 개수가 다르면 당연히 변경이 있다.
  const previousKeys = Object.keys(previousProps);
  const nextKeys = Object.keys(nextProps);

  if (previousKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of nextKeys) {
    // 같은 이름의 속성이라도 값이 다르면 DOM 수정이 필요하다.
    if (previousProps[key] !== nextProps[key]) {
      return true;
    }
  }

  return false;
}
