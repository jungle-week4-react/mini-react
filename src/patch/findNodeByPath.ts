import type { NodePath } from "../types.js";

/**
 * 요구사항:
 * - 4단계 Patch 적용 및 DOM 관리
 * - path를 기준으로 실제 DOM 노드를 찾는다.
 * - 공백 텍스트 노드로 인한 인덱스 어긋남을 줄인다.
 *
 * 관련 API:
 * - findNodeByPath(root, path): Node | null
 */

/**
 * VDOM 경로와 DOM 경로를 맞추기 위해 의미 없는 공백 텍스트 노드는 제외한다.
 */
function getRelevantChildNodes(node: Node): Node[] {
  return Array.from(node.childNodes).filter((childNode) => {
    if (childNode.nodeType !== Node.TEXT_NODE) {
      return true;
    }

    return (childNode.textContent ?? "").trim() !== "";
  });
}

/**
 * path를 따라 내려가며 실제 DOM 노드를 찾는다.
 */
export function findNodeByPath(root: Node, path: NodePath): Node | null {
  let currentNode: Node | null = root;

  for (const index of path) {
    if (currentNode === null) {
      return null;
    }

    const childNodes = getRelevantChildNodes(currentNode);
    currentNode = childNodes[index] ?? null;
  }

  return currentNode;
}

/**
 * 삽입/이동 기준 노드를 찾을 때도 같은 child 기준을 유지하기 위한 보조 함수다.
 */
export function findReferenceNode(parentNode: Node, childIndex: number): Node | null {
  const childNodes = getRelevantChildNodes(parentNode);

  return childNodes[childIndex] ?? null;
}
