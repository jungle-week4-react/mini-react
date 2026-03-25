import type { NodePath, Patch, VNode } from "../types.js";
import { diffChildren } from "./diffChildren.js";
import { diffProps } from "./diffProps.js";

/**
 * 요구사항:
 * - 3단계 Diff 구현
 * - 텍스트, 속성, 노드 교체, 삽입, 삭제를 판별한다.
 *
 * 관련 API:
 * - diffNode(oldNode, newNode, path, patches): void
 */

/**
 * 단일 노드를 비교하고 차이가 있으면 patch 목록에 누적한다.
 */
export function diffNode(
  oldNode: VNode | null,
  newNode: VNode | null,
  path: NodePath,
  patches: Patch[],
): void {
  // 이전에는 없고 새로 생긴 노드는 삽입 대상이다.
  if (oldNode === null && newNode !== null) {
    patches.push({
      type: "INSERT",
      path,
      node: newNode,
    });
    return;
  }

  // 이전에는 있었지만 새 트리에서 사라진 노드는 삭제 대상이다.
  if (oldNode !== null && newNode === null) {
    patches.push({
      type: "DELETE",
      path,
    });
    return;
  }

  if (oldNode === null || newNode === null) {
    return;
  }

  // 노드 타입이 다르면 같은 노드로 재사용할 수 없으므로 교체한다.
  if (oldNode.nodeType !== newNode.nodeType) {
    patches.push({
      type: "REPLACE",
      path,
      node: newNode,
    });
    return;
  }

  if (oldNode.nodeType === "TEXT" && newNode.nodeType === "TEXT") {
    if (oldNode.textContent !== newNode.textContent) {
      patches.push({
        type: "UPDATE_TEXT",
        path,
        textContent: newNode.textContent,
      });
    }

    return;
  }

  if (oldNode.nodeType !== "ELEMENT" || newNode.nodeType !== "ELEMENT") {
    return;
  }

  // 같은 위치라도 tag가 다르면 완전히 다른 element로 본다.
  if (oldNode.tagName !== newNode.tagName) {
    patches.push({
      type: "REPLACE",
      path,
      node: newNode,
    });
    return;
  }

  const changedProps = diffProps(oldNode.props, newNode.props);

  if (Object.keys(changedProps).length > 0) {
    patches.push({
      type: "UPDATE_PROPS",
      path,
      props: changedProps,
    });
  }

  diffChildren(oldNode.children, newNode.children, path, patches);
}
