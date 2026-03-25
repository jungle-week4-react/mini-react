import {
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

const EMPTY_PROPS: FiberProps = {};
const TEXT_CONTENT_PROP = 'nodeValue';

export function commitRoot(
  root: FiberRoot | null = fiberRuntime.workInProgressRoot,
  finishedWork: Fiber | null = fiberRuntime.workInProgress,
): void {
  if (root === null || finishedWork === null) {
    return;
  }

  // render phase가 끝났으니 commit phase로 전이한다.
  setFiberStatus(root, FiberRenderState.Commit);
  // flags를 따라 실제 DOM 변경을 반영한다.
  commitMutationEffects(finishedWork);
  // 새 트리를 current로 교체한다.
  root.current = finishedWork;
  // 이번 렌더에 쓰던 runtime 포인터를 비운다.
  fiberRuntime.nextUnitOfWork = null;
  fiberRuntime.workInProgress = null;
  fiberRuntime.workInProgressRoot = null;
  fiberRuntime.renderDeadline = 0;
  // 모든 반영이 끝났으니 Idle로 돌아간다.
  setFiberStatus(root, FiberRenderState.Idle);
}

export function completeFiberNode(fiber: Fiber): void {
  // root는 이미 container를 stateNode로 가진다.
  if (fiber.type === ROOT_FIBER_TYPE || fiber.stateNode !== null) {
    return;
  }

  // host Fiber마다 실제 DOM 노드를 한 번만 만든다.
  fiber.stateNode = createStateNode(fiber);
}

export function commitPlacement(fiber: Fiber): void {
  // root나 DOM이 없는 노드는 삽입 대상이 아니다.
  if (fiber.type === ROOT_FIBER_TYPE || fiber.stateNode === null) {
    return;
  }

  // 실제 부모 DOM과 삽입 기준 형제를 찾는다.
  const hostParent = getHostParentNode(fiber);
  const hostSibling = getHostSibling(fiber);

  if (hostParent === null) {
    return;
  }

  // 뒤에 둘 형제가 없으면 맨 끝에 붙인다.
  if (hostSibling === null) {
    hostParent.appendChild(fiber.stateNode);
    return;
  }

  // 형제가 있으면 그 앞에 넣어 순서를 맞춘다.
  hostParent.insertBefore(fiber.stateNode, hostSibling);
}

export function commitUpdate(fiber: Fiber): void {
  // 재사용된 노드만 props 비교 업데이트가 가능하다.
  if (fiber.stateNode === null || fiber.alternate === null) {
    return;
  }

  // 이전 current props와 새 props를 비교해서 DOM을 수정한다.
  const previousProps = fiber.alternate.props;
  updateStateNode(fiber.stateNode, previousProps, fiber.props);
}

export function commitDeletion(fiber: Fiber, hostParent: Node): void {
  // 실제 DOM이 있으면 부모에서 바로 제거한다.
  if (fiber.stateNode !== null && fiber.type !== ROOT_FIBER_TYPE) {
    if (fiber.stateNode.parentNode === hostParent) {
      hostParent.removeChild(fiber.stateNode);
    }

    return;
  }

  // host DOM이 없는 중간 Fiber면 자식 쪽으로 내려가서 제거한다.
  let child = fiber.child;

  while (child !== null) {
    commitDeletion(child, hostParent);
    child = child.sibling;
  }
}

function commitMutationEffects(fiber: Fiber | null): void {
  let currentFiber = fiber;

  while (currentFiber !== null) {
    // 현재 Fiber의 flags를 먼저 커밋한다.
    commitMutationEffectOnFiber(currentFiber);

    // child -> sibling -> parent.sibling 순으로 순회한다.
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
  // 삭제는 현재 Fiber의 host 부모 기준으로 처리한다.
  const hostChildrenParent =
    fiber.stateNode !== null && fiber.type !== TEXT_FIBER_TYPE
      ? fiber.stateNode
      : getHostParentNode(fiber);

  if (fiber.deletions !== null && hostChildrenParent !== null) {
    for (const deletion of fiber.deletions) {
      commitDeletion(deletion, hostChildrenParent);
    }
  }

  // Placement는 새 DOM 삽입 또는 이동이다.
  if ((fiber.flags & FiberFlags.Placement) !== 0) {
    commitPlacement(fiber);
  }

  // Update는 기존 DOM 속성 수정이다.
  if ((fiber.flags & FiberFlags.Update) !== 0) {
    commitUpdate(fiber);
  }

  // 커밋한 flags/deletions는 비워 다음 렌더에 넘기지 않는다.
  fiber.flags = FiberFlags.NoFlags;
  fiber.deletions = null;
}

function createStateNode(fiber: Fiber): Node {
  // root container 기준으로 document를 찾는다.
  const ownerDocument = getOwnerDocument(fiber);

  // text는 Text 노드로 만든다.
  if (fiber.type === TEXT_FIBER_TYPE) {
    return ownerDocument.createTextNode(fiber.props[TEXT_CONTENT_PROP] ?? '');
  }

  // element는 태그 이름으로 만들고 초기 props를 반영한다.
  const element = ownerDocument.createElement(fiber.type);

  updateElementProps(element, EMPTY_PROPS, fiber.props);

  return element;
}

function getHostParentNode(fiber: Fiber): Node | null {
  // 부모 포인터를 타고 올라가 실제 DOM 부모를 찾는다.
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
  // 아직 삽입되지 않은 sibling은 건너뛰고 안정된 host sibling을 찾는다.
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
  // 가장 가까운 stateNode에서 ownerDocument를 가져온다.
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
  // text는 nodeValue만 비교하면 된다.
  if (stateNode instanceof Text) {
    const nextValue = nextProps[TEXT_CONTENT_PROP] ?? '';

    if (stateNode.nodeValue !== nextValue) {
      stateNode.nodeValue = nextValue;
    }

    return;
  }

  // element는 attribute diff를 적용한다.
  if (stateNode instanceof Element) {
    updateElementProps(stateNode, previousProps, nextProps);
  }
}

function updateElementProps(
  element: Element,
  previousProps: FiberProps,
  nextProps: FiberProps,
): void {
  // 사라진 attribute는 제거한다.
  for (const key of Object.keys(previousProps)) {
    if (key in nextProps === false) {
      element.removeAttribute(key);
    }
  }

  // 새 값이 다르면 실제 DOM attribute를 갱신한다.
  for (const [key, value] of Object.entries(nextProps)) {
    if (previousProps[key] !== value) {
      element.setAttribute(key, value);
    }
  }
}
