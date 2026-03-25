import {
  emitFiberCommitSummary,
  fiberRuntime,
  FiberFlags,
  FiberRenderState,
  ROOT_FIBER_TYPE,
  setFiberStatus,
  TEXT_FIBER_TYPE,
  type Fiber,
  type FiberProps,
  type FiberRoot,
} from './fiber.js';

// element 생성 직후에는 이전 props가 없으므로 빈 객체와 비교한다.
const EMPTY_PROPS: FiberProps = {};
// text Fiber는 실제 DOM Text의 nodeValue에 문자열이 들어간다.
const TEXT_CONTENT_PROP = 'nodeValue';

/*
 * commit 전체 흐름
 * 1. render phase가 끝나면 commitRoot()가 호출된다.
 * 2. collectCommitPlan()가 어떤 DOM 작업이 필요한지 목록만 모은다.
 * 3. applyCommitPlan()가 appendChild/insertBefore/removeChild/update를 실제로 호출한다.
 * 4. 모든 반영이 끝나면 WIP를 새 current로 바꾸고 상태를 idle로 돌린다.
 *
 * 여기서 중요한 점:
 * - render phase는 "무엇을 바꿀지 계산"하는 단계
 * - commit phase는 "계산한 변경을 실제 DOM에 적용"하는 단계
 */

type CommitAction =
  | {
      kind: 'deletion';
      fiber: Fiber;
      hostParent: Node;
    }
  | {
      kind: 'placement';
      fiber: Fiber;
    }
  | {
      kind: 'update';
      fiber: Fiber;
    };

// commitRoot는 render phase에서 계산만 해둔 결과를 실제 DOM에 반영하는 진입점이다.
export function commitRoot(
  root: FiberRoot | null = fiberRuntime.workInProgressRoot,
  finishedWork: Fiber | null = fiberRuntime.workInProgress,
): void {
  // 순서 1.
  // render에서 만든 finishedWork 트리를 실제 DOM에 반영하는 진입점이다.
  // root나 finishedWork가 없으면 커밋할 대상이 없다.
  if (root === null || finishedWork === null) {
    return;
  }

  // 이제부터는 실제 DOM을 건드리는 단계다.
  setFiberStatus(root, FiberRenderState.Commit);
  // 순서 2.
  // 어떤 DOM 작업을 해야 하는지 먼저 액션 목록만 만든다.
  // 먼저 어떤 DOM 작업을 해야 하는지 목록만 모은다.
  const selectionStartedAt = performance.now();
  const commitPlan = collectCommitPlan(finishedWork);
  const selectionElapsedMs = performance.now() - selectionStartedAt;
  // 순서 3.
  // 위에서 모아둔 액션을 실제 DOM API로 실행한다.
  // 실제 DOM API 호출은 그 다음 단계에서 한 번에 적용한다.
  const applyStartedAt = performance.now();
  applyCommitPlan(commitPlan);
  const applyElapsedMs = performance.now() - applyStartedAt;
  // 순서 4.
  // 이제 workInProgress가 새 current가 되므로 다음 diff는 이 트리를 기준으로 한다.
  // 모든 반영이 끝났다면 "방금 계산한 WIP"가 새 current가 된다.
  root.current = finishedWork;
  // 이번 render의 책갈피는 더 이상 필요 없으므로 비운다.
  fiberRuntime.nextUnitOfWork = null;
  fiberRuntime.workInProgress = null;
  fiberRuntime.workInProgressRoot = null;
  fiberRuntime.renderDeadline = 0;
  emitFiberCommitSummary(root, {
    selectionElapsedMs,
    applyElapsedMs,
    operationCount: commitPlan.actions.length,
    placementCount: commitPlan.placementCount,
    updateCount: commitPlan.updateCount,
    deletionCount: commitPlan.deletionCount,
  });
  // 루트 상태를 idle로 되돌린다.
  setFiberStatus(root, FiberRenderState.Idle);
}

export function completeFiberNode(fiber: Fiber): void {
  // ROOT는 container DOM을 이미 알고 있으니 새 DOM을 만들 필요가 없다.
  if (fiber.type === ROOT_FIBER_TYPE || fiber.stateNode !== null) {
    return;
  }

  // host Fiber라면 이 시점에 실제 DOM 노드를 한 번만 만들어 둔다.
  // 아직 화면에 붙이지는 않는다.
  fiber.stateNode = createStateNode(fiber);
}

export function commitPlacement(fiber: Fiber): void {
  // ROOT는 삽입 대상이 아니고, DOM이 없으면 삽입할 것도 없다.
  if (fiber.type === ROOT_FIBER_TYPE || fiber.stateNode === null) {
    return;
  }

  // "어느 부모 아래에 붙일지"와 "어느 형제 앞에 넣을지"를 찾는다.
  const hostParent = getHostParentNode(fiber);
  const hostSibling = getHostSibling(fiber);

  if (hostParent === null) {
    return;
  }

  // 기준 형제가 없으면 맨 끝 append
  if (hostSibling === null) {
    hostParent.appendChild(fiber.stateNode);
    return;
  }

  // 기준 형제가 있으면 그 앞 insertBefore
  hostParent.insertBefore(fiber.stateNode, hostSibling);
}

export function commitUpdate(fiber: Fiber): void {
  // alternate가 있다는 것은 "이전 current DOM을 재사용 중"이라는 뜻이다.
  // 재사용이 아닐 때는 비교 대상이 없으므로 Update를 할 수 없다.
  if (fiber.stateNode === null || fiber.alternate === null) {
    return;
  }

  // old props와 new props를 비교해 실제 DOM을 수정한다.
  const previousProps = fiber.alternate.props;
  updateStateNode(fiber.stateNode, previousProps, fiber.props);
}

export function commitDeletion(fiber: Fiber, hostParent: Node): void {
  // 이 Fiber가 실제 DOM을 가지고 있다면 부모에서 바로 제거하면 된다.
  if (fiber.stateNode !== null && fiber.type !== ROOT_FIBER_TYPE) {
    if (fiber.stateNode.parentNode === hostParent) {
      hostParent.removeChild(fiber.stateNode);
    }

    return;
  }

  // 함수 컴포넌트 같은 중간 Fiber라면 자기 DOM은 없고 자식 DOM만 있을 수 있다.
  // 그래서 자식으로 내려가 host DOM을 찾아 지운다.
  let child = fiber.child;

  while (child !== null) {
    commitDeletion(child, hostParent);
    child = child.sibling;
  }
}

function collectCommitPlan(fiber: Fiber | null): {
  actions: CommitAction[];
  visitedFibers: Fiber[];
  placementCount: number;
  updateCount: number;
  deletionCount: number;
} {
  // 순서 2의 내부 단계.
  // DFS로 finishedWork 전체를 훑으면서
  // deletion / placement / update 액션을 배열에 모은다.
  let currentFiber = fiber;
  const actions: CommitAction[] = [];
  const visitedFibers: Fiber[] = [];
  let placementCount = 0;
  let updateCount = 0;
  let deletionCount = 0;

  while (currentFiber !== null) {
    // 커밋 후보를 고르는 단계이므로 아직 DOM은 건드리지 않고 액션만 수집한다.
    visitedFibers.push(currentFiber);
    const summary = collectCommitActionsFromFiber(currentFiber, actions);

    placementCount += summary.placementCount;
    updateCount += summary.updateCount;
    deletionCount += summary.deletionCount;

    // 순회 순서는 render 때와 비슷한 DFS다.
    // child가 있으면 child로 내려가고,
    // 없으면 sibling을 찾고,
    // 그것도 없으면 부모로 올라가 sibling을 찾는다.
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

  return {
    actions,
    visitedFibers,
    placementCount,
    updateCount,
    deletionCount,
  };
}

function collectCommitActionsFromFiber(
  fiber: Fiber,
  actions: CommitAction[],
): {
  placementCount: number;
  updateCount: number;
  deletionCount: number;
} {
  // 한 Fiber가 들고 있는 flags와 deletions를 읽어
  // "나중에 실행할 DOM 액션" 객체로 바꾸는 단계다.
  let placementCount = 0;
  let updateCount = 0;
  let deletionCount = 0;
  // 삭제는 "이 노드의 자식들이 붙어 있던 실제 DOM 부모" 기준으로 처리해야 한다.
  const hostChildrenParent =
    fiber.stateNode !== null && fiber.type !== TEXT_FIBER_TYPE
      ? fiber.stateNode
      : getHostParentNode(fiber);

  // 부모 Fiber.deletions에 모아둔 삭제 대상들을 먼저 제거한다.
  if (fiber.deletions !== null && hostChildrenParent !== null) {
    for (const deletion of fiber.deletions) {
      actions.push({
        kind: 'deletion',
        fiber: deletion,
        hostParent: hostChildrenParent,
      });
      deletionCount += 1;
    }
  }

  // Placement는 삽입 또는 이동
  if ((fiber.flags & FiberFlags.Placement) !== 0) {
    actions.push({
      kind: 'placement',
      fiber,
    });
    placementCount += 1;
  }

  // Update는 기존 DOM 속성 수정
  if ((fiber.flags & FiberFlags.Update) !== 0) {
    actions.push({
      kind: 'update',
      fiber,
    });
    updateCount += 1;
  }

  return {
    placementCount,
    updateCount,
    deletionCount,
  };
}

function applyCommitPlan(plan: {
  actions: CommitAction[];
  visitedFibers: Fiber[];
}): void {
  // 순서 3의 실제 실행 단계.
  // 여기서 appendChild / insertBefore / removeChild / update가 호출된다.
  for (const action of plan.actions) {
    if (action.kind === 'deletion') {
      commitDeletion(action.fiber, action.hostParent);
      continue;
    }

    if (action.kind === 'placement') {
      commitPlacement(action.fiber);
      continue;
    }

    commitUpdate(action.fiber);
  }

  // 이미 처리한 flags/deletions는 다음 렌더에 남기지 않도록 비운다.
  for (const fiber of plan.visitedFibers) {
    fiber.flags = FiberFlags.NoFlags;
    fiber.deletions = null;
  }
}

function createStateNode(fiber: Fiber): Node {
  // createElement/createTextNode를 하려면 document가 필요하다.
  // 가장 가까운 부모 DOM에서 ownerDocument를 찾는다.
  const ownerDocument = getOwnerDocument(fiber);

  // text Fiber는 실제 Text DOM 노드로 만든다.
  if (fiber.type === TEXT_FIBER_TYPE) {
    return ownerDocument.createTextNode(fiber.props[TEXT_CONTENT_PROP] ?? '');
  }

  // host element는 tag 이름으로 DOM을 만들고 초기 props를 적용한다.
  const element = ownerDocument.createElement(fiber.type);

  updateElementProps(element, EMPTY_PROPS, fiber.props);

  return element;
}

function getHostParentNode(fiber: Fiber): Node | null {
  // Fiber 부모 체인을 따라 올라가며
  // 실제 DOM을 가진 가장 가까운 조상을 찾는다.
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
  // insertBefore의 기준 형제는 "이미 화면에 안정적으로 존재하는 DOM"이어야 한다.
  // 따라서 아직 Placement가 남아 있는 sibling은 기준으로 쓰면 안 된다.
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
  // document.createElement를 하기 위해 가까운 DOM 조상에서 ownerDocument를 가져온다.
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
  // Text DOM은 nodeValue만 바뀌면 된다.
  if (stateNode instanceof Text) {
    const nextValue = nextProps[TEXT_CONTENT_PROP] ?? '';

    if (stateNode.nodeValue !== nextValue) {
      stateNode.nodeValue = nextValue;
    }

    return;
  }

  // Element DOM은 attribute 수준 비교를 적용한다.
  if (stateNode instanceof Element) {
    updateElementProps(stateNode, previousProps, nextProps);
  }
}

function updateElementProps(
  element: Element,
  previousProps: FiberProps,
  nextProps: FiberProps,
): void {
  // 예전에는 있었는데 지금은 없는 속성은 DOM에서 제거한다.
  for (const key of Object.keys(previousProps)) {
    if (key in nextProps === false) {
      element.removeAttribute(key);
    }
  }

  // 새 값이 다르면 DOM 속성을 갱신한다.
  for (const [key, value] of Object.entries(nextProps)) {
    if (previousProps[key] !== value) {
      element.setAttribute(key, value);
    }
  }
}
