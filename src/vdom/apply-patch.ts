import type { VNodePatch, VNodePath } from './diff.js';
import type { VNode } from './node.js';
import { createDOMNodeFromVNode } from './dom.js';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_NODE = 9;

export function applyPatches(root: Node, patches: VNodePatch[]): Node {
  let currentRoot = root;
  // patches를 순회하면서 patch 실행
  for (const patch of patches) {
    currentRoot = applyPatch(currentRoot, patch);
  }

  return currentRoot;
}

export function applyPatch(root: Node, patch: VNodePatch): Node {
  switch (patch.type) {
    case 'replace':
      return applyReplacePatch(root, patch.path, patch.node);
    case 'insert':
      return applyInsertPatch(root, patch.path, patch.node);
    case 'remove':
      return applyRemovePatch(root, patch.path);
    case 'move':
      return applyMovePatch(root, patch.from, patch.to);
    case 'text':
      return applyTextPatch(root, patch.path, patch.value);
    case 'props':
      return applyPropsPatch(root, patch.path, patch.set, patch.remove);
  }
}

function applyReplacePatch(root: Node, path: VNodePath, node: VNode): Node {
  const target = getNodeAtPath(root, path);
  const nextNode = createDOMNodeFromVNode(node, getNodeDocument(target));

  // 루트인 경우
  if (path.length === 0) {
    if (target.parentNode !== null) {
      target.parentNode.replaceChild(nextNode, target);
    }

    return nextNode;
  }

  if (target.parentNode === null) {
    throw new Error(
      `Cannot replace node at path ${formatPath(path)} without a parent`,
    );
  }

  target.parentNode.replaceChild(nextNode, target);

  return root;
}

function applyInsertPatch(root: Node, path: VNodePath, node: VNode): Node {
  if (path.length === 0) {
    throw new Error('Cannot insert at the root path');
  }

  const parentPath = path.slice(0, -1);
  const childIndex = path[path.length - 1]!;
  const parentNode = getNodeAtPath(root, parentPath);

  // text 노드는 자식을 가질수 없으니 에러 핸들링
  assertCanHaveChildren(parentNode, parentPath);

  if (childIndex < 0 || childIndex > parentNode.childNodes.length) {
    throw new Error(
      `Cannot insert at index ${childIndex} under path ${formatPath(parentPath)}`,
    );
  }

  const nextNode = createDOMNodeFromVNode(node, getNodeDocument(parentNode));
  const referenceNode = parentNode.childNodes.item(childIndex);

  parentNode.insertBefore(nextNode, referenceNode);

  return root;
}

function applyRemovePatch(root: Node, path: VNodePath): Node {
  if (path.length === 0) {
    throw new Error('Cannot remove the root node');
  }

  const target = getNodeAtPath(root, path);

  if (target.parentNode === null) {
    throw new Error(
      `Cannot remove node at path ${formatPath(path)} without a parent`,
    );
  }

  target.parentNode.removeChild(target);

  return root;
}

function applyMovePatch(root: Node, from: VNodePath, to: VNodePath): Node {
  validateMovePaths(from, to);

  const parentPath = from.slice(0, -1);
  const fromIndex = from[from.length - 1]!;
  const toIndex = to[to.length - 1]!;
  const parentNode = parentPath.length === 0
    ? root
    : getNodeAtPath(root, parentPath);

  assertCanHaveChildren(parentNode, parentPath);

  if (fromIndex < 0 || fromIndex >= parentNode.childNodes.length) {
    throw new Error(
      `Cannot move from index ${fromIndex} under path ${formatPath(parentPath)}`,
    );
  }

  if (toIndex < 0 || toIndex >= parentNode.childNodes.length) {
    throw new Error(
      `Cannot move to index ${toIndex} under path ${formatPath(parentPath)}`,
    );
  }

  if (fromIndex === toIndex) {
    return root;
  }

  const targetNode = parentNode.childNodes.item(fromIndex);

  if (targetNode === null) {
    throw new Error(`Cannot resolve node at path ${formatPath(from)}`);
  }

  parentNode.removeChild(targetNode);

  const referenceNode = parentNode.childNodes.item(toIndex);

  parentNode.insertBefore(targetNode, referenceNode);

  return root;
}

function applyTextPatch(root: Node, path: VNodePath, value: string): Node {
  const target = getNodeAtPath(root, path);

  if (target.nodeType !== TEXT_NODE) {
    throw new Error(`Expected a text node at path ${formatPath(path)}`);
  }

  target.nodeValue = value;

  return root;
}

function applyPropsPatch(
  root: Node,
  path: VNodePath,
  set: Record<string, string>,
  remove: string[],
): Node {
  const target = getNodeAtPath(root, path);

  if (target.nodeType !== ELEMENT_NODE) {
    throw new Error(`Expected an element node at path ${formatPath(path)}`);
  }

  const element = target as Element;

  for (const attributeName of remove) {
    element.removeAttribute(attributeName);
  }

  for (const [attributeName, value] of Object.entries(set)) {
    element.setAttribute(attributeName, value);
  }

  return root;
}

// path 기준으로 루트에서 탐색해 노드를 반환
function getNodeAtPath(root: Node, path: VNodePath): Node {
  let currentNode = root;

  for (const index of path) {
    const nextNode = currentNode.childNodes.item(index);

    if (nextNode === null) {
      throw new Error(`Cannot resolve node at path ${formatPath(path)}`);
    }

    currentNode = nextNode;
  }

  return currentNode;
}

function assertCanHaveChildren(node: Node, path: VNodePath): void {
  if (node.nodeType === TEXT_NODE) {
    throw new Error(
      `Cannot insert children into a text node at path ${formatPath(path)}`,
    );
  }
}

function getNodeDocument(node: Node): Document {
  if (node.nodeType === DOCUMENT_NODE) {
    return node as Document;
  }

  if (node.ownerDocument !== null) {
    return node.ownerDocument;
  }

  throw new Error('Cannot resolve Document from the current DOM tree');
}

function formatPath(path: VNodePath): string {
  if (path.length === 0) {
    return 'root';
  }

  return path.join('.');
}

function validateMovePaths(from: VNodePath, to: VNodePath): void {
  if (from.length === 0 || to.length === 0) {
    throw new Error('Cannot move the root node');
  }

  if (from.length !== to.length) {
    throw new Error(
      `Cannot move nodes between different depths: ${formatPath(from)} -> ${formatPath(to)}`,
    );
  }

  const fromParentPath = from.slice(0, -1);
  const toParentPath = to.slice(0, -1);

  if (pathsEqual(fromParentPath, toParentPath) === false) {
    throw new Error(
      `Cannot move nodes across different parents: ${formatPath(from)} -> ${formatPath(to)}`,
    );
  }
}

function pathsEqual(left: VNodePath, right: VNodePath): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
