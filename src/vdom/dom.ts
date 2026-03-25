import type { VNodePatch } from './diff.js';
import type { VNode } from './node.js';

// 내부 VNode의 key는 브라우저 DOM에서는 data-key 속성으로 반영한다.
const HTML_KEY_ATTRIBUTE_NAME = 'data-key';

// VNode를 실제 DOM Node로 재귀 변환한다.
// text는 Text node로, element는 Element로 만들고 자식도 같은 방식으로 붙인다.
export function createDomNodeFromVNode(vnode: VNode): Node {
  if (vnode.type === 'text') {
    return document.createTextNode(vnode.value);
  }

  const element = document.createElement(vnode.tag);

  // key는 diff에서 같은 형제 노드를 식별하는 값이므로 DOM에도 남겨 둔다.
  if (vnode.key !== null) {
    element.setAttribute(HTML_KEY_ATTRIBUTE_NAME, vnode.key);
  }

  // 일반 props는 그대로 DOM attribute로 옮긴다.
  for (const [name, value] of Object.entries(vnode.props)) {
    element.setAttribute(name, value);
  }

  // 자식 노드도 순서대로 재귀 생성해서 붙인다.
  for (const child of vnode.children) {
    element.append(createDomNodeFromVNode(child));
  }

  return element;
}

// container 내부를 vnode 기준으로 통째로 새로 그릴 때 사용한다.
// 초기 렌더나 완전 초기화 시점에 주로 호출된다.
export function mountVNode(container: Element, vnode: VNode): Node {
  const rootNode = createDomNodeFromVNode(vnode);

  container.replaceChildren(rootNode);

  return rootNode;
}

// diff 결과로 생성된 patch 목록을 순서대로 실제 DOM에 적용한다.
// patch 적용 중 루트 노드가 교체될 수 있으므로 현재 루트 참조를 계속 갱신한다.
export function applyPatches(container: Element, patches: VNodePatch[]): void {
  let rootNode = container.firstChild;

  for (const patch of patches) {
    rootNode = applyPatch(container, rootNode, patch);
  }
}

// patch 타입별로 실제 DOM 변경 동작을 분기한다.
function applyPatch(
  container: Element,
  rootNode: ChildNode | null,
  patch: VNodePatch,
): ChildNode | null {
  if (patch.type === 'replace') {
    return replaceNode(container, rootNode, patch.path, createDomNodeFromVNode(patch.node));
  }

  if (patch.type === 'insert') {
    insertNode(container, rootNode, patch.path, createDomNodeFromVNode(patch.node));
    return rootNode;
  }

  if (patch.type === 'remove') {
    return removeNode(container, rootNode, patch.path);
  }

  if (patch.type === 'text') {
    const targetNode = getNodeAtPath(rootNode, patch.path);

    // text patch는 path가 가리키는 노드의 nodeValue만 바꾼다.
    if (targetNode !== null && targetNode.nodeType === Node.TEXT_NODE) {
      targetNode.nodeValue = patch.value;
    }

    return rootNode;
  }

  const targetNode = getNodeAtPath(rootNode, patch.path);

  if (targetNode instanceof Element) {
    // props patch는 제거 목록을 먼저 처리한 뒤 set 목록을 반영한다.
    for (const name of patch.remove) {
      targetNode.removeAttribute(name);
    }

    for (const [name, value] of Object.entries(patch.set)) {
      targetNode.setAttribute(name, value);
    }
  }

  return rootNode;
}

// replace는 path가 가리키는 기존 노드를 새 노드 하나로 통째로 바꾼다.
// 루트 path([])인 경우 container의 첫 자식 자체가 바뀔 수 있다.
function replaceNode(
  container: Element,
  rootNode: ChildNode | null,
  path: number[],
  nextNode: Node,
): ChildNode | null {
  if (path.length === 0) {
    if (rootNode === null) {
      container.replaceChildren(nextNode);
    } else {
      container.replaceChild(nextNode, rootNode);
    }

    return container.firstChild;
  }

  const targetNode = getNodeAtPath(rootNode, path);

  if (targetNode?.parentNode !== null && targetNode?.parentNode !== undefined) {
    targetNode.parentNode.replaceChild(nextNode, targetNode);
  }

  return rootNode;
}

// insert는 parentPath 위치의 부모를 찾은 뒤 insertIndex 앞에 새 노드를 넣는다.
// anchor가 없으면 append처럼 마지막에 붙는다.
function insertNode(
  container: Element,
  rootNode: ChildNode | null,
  path: number[],
  nextNode: Node,
): void {
  if (path.length === 0) {
    if (rootNode === null) {
      container.replaceChildren(nextNode);
      return;
    }

    container.insertBefore(nextNode, rootNode);
    return;
  }

  const parentPath = path.slice(0, -1);
  const insertIndex = path[path.length - 1];
  const parentNode = parentPath.length === 0
    ? rootNode
    : getNodeAtPath(rootNode, parentPath);

  if (parentNode === null) {
    return;
  }

  const anchorNode = parentNode.childNodes.item(insertIndex) ?? null;

  parentNode.insertBefore(nextNode, anchorNode);
}

// remove는 path가 가리키는 노드를 DOM에서 제거한다.
function removeNode(
  container: Element,
  rootNode: ChildNode | null,
  path: number[],
): ChildNode | null {
  if (path.length === 0) {
    rootNode?.remove();
    return container.firstChild;
  }

  const targetNode = getNodeAtPath(rootNode, path);

  targetNode?.remove();

  return rootNode;
}

// path 배열을 따라 내려가 실제 DOM의 특정 노드를 찾아낸다.
// 예: [1, 0]은 루트의 두 번째 자식 아래 첫 번째 자식을 의미한다.
function getNodeAtPath(
  rootNode: ChildNode | null,
  path: number[],
): ChildNode | null {
  let currentNode = rootNode;

  for (const index of path) {
    if (currentNode === null) {
      return null;
    }

    currentNode = currentNode.childNodes.item(index);
  }

  return currentNode;
}
