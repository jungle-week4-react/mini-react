import type { NodePath, Patch, VNode } from "../types.js";
import { diffNode } from "./diffNode.js";

/**
 * 요구사항:
 * - 3단계 Diff 구현
 * - 형제 노드는 key 기반으로 비교한다.
 * - key가 없으면 인덱스 기반으로 비교한다.
 *
 * 관련 API:
 * - diffChildren(oldChildren, newChildren, parentPath, patches): void
 */

interface IndexedVNode {
  index: number;
  node: VNode;
}

/**
 * 형제 노드 목록을 비교해 삽입/삭제/이동/재귀 비교 patch를 누적한다.
 */
export function diffChildren(
  oldChildren: VNode[],
  newChildren: VNode[],
  parentPath: NodePath,
  patches: Patch[],
): void {
  const oldKeyed = new Map<string, IndexedVNode>();
  const newKeyed = new Map<string, IndexedVNode>();
  const oldUnkeyed: IndexedVNode[] = [];
  const newUnkeyed: IndexedVNode[] = [];

  // key 유무에 따라 분리해두면 key 우선 비교와 인덱스 fallback을 분리하기 쉽다.
  oldChildren.forEach((node, index) => {
    if (node.key !== null) {
      oldKeyed.set(node.key, { index, node });
      return;
    }

    oldUnkeyed.push({ index, node });
  });

  newChildren.forEach((node, index) => {
    if (node.key !== null) {
      newKeyed.set(node.key, { index, node });
      return;
    }

    newUnkeyed.push({ index, node });
  });

  // key가 있는 노드는 같은 key를 가진 형제끼리 대응시킨다.
  newKeyed.forEach(({ index: newIndex, node: newNode }, key) => {
    const oldEntry = oldKeyed.get(key);

    if (!oldEntry) {
      patches.push({
        type: "INSERT",
        path: [...parentPath, newIndex],
        node: newNode,
      });
      return;
    }

    diffNode(oldEntry.node, newNode, [...parentPath, oldEntry.index], patches);

    if (oldEntry.index !== newIndex) {
      patches.push({
        type: "MOVE",
        from: [...parentPath, oldEntry.index],
        to: [...parentPath, newIndex],
      });
    }
  });

  // 이전에는 있었지만 새 트리에서 사라진 key 노드는 삭제한다.
  oldKeyed.forEach(({ index }, key) => {
    if (!newKeyed.has(key)) {
      patches.push({
        type: "DELETE",
        path: [...parentPath, index],
      });
    }
  });

  // key가 없는 노드는 같은 순서끼리 비교한다.
  const maxLength = Math.max(oldUnkeyed.length, newUnkeyed.length);

  for (let offset = 0; offset < maxLength; offset += 1) {
    const oldEntry = oldUnkeyed[offset];
    const newEntry = newUnkeyed[offset];
    const targetIndex = newEntry?.index ?? oldEntry?.index;

    if (targetIndex === undefined) {
      continue;
    }

    diffNode(
      oldEntry?.node ?? null,
      newEntry?.node ?? null,
      [...parentPath, targetIndex],
      patches,
    );
  }
}
