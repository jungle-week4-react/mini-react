import type { VNodePatch } from './diff.js';
import type { VNode } from './node.js';

const HTML_KEY_ATTRIBUTE_NAME = 'data-key';

export function createDomNodeFromVNode(vnode: VNode): Node {
  if (vnode.type === 'text') {
    return document.createTextNode(vnode.value);
  }

  const element = document.createElement(vnode.tag);

  if (vnode.key !== null) {
    element.setAttribute(HTML_KEY_ATTRIBUTE_NAME, vnode.key);
  }

  for (const [name, value] of Object.entries(vnode.props)) {
    element.setAttribute(name, value);
  }

  for (const child of vnode.children) {
    element.append(createDomNodeFromVNode(child));
  }

  return element;
}

export function mountVNode(container: Element, vnode: VNode): Node {
  const rootNode = createDomNodeFromVNode(vnode);

  container.replaceChildren(rootNode);

  return rootNode;
}

export function applyPatches(container: Element, patches: VNodePatch[]): void {
  let rootNode = container.firstChild;

  for (const patch of patches) {
    rootNode = applyPatch(container, rootNode, patch);
  }
}

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

    if (targetNode !== null && targetNode.nodeType === Node.TEXT_NODE) {
      targetNode.nodeValue = patch.value;
    }

    return rootNode;
  }

  const targetNode = getNodeAtPath(rootNode, patch.path);

  if (targetNode instanceof Element) {
    for (const name of patch.remove) {
      targetNode.removeAttribute(name);
    }

    for (const [name, value] of Object.entries(patch.set)) {
      targetNode.setAttribute(name, value);
    }
  }

  return rootNode;
}

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
