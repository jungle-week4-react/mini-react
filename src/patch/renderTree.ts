import type { VNode } from "../types.js";
import { syncElementFromVNode } from "./applyPatch.js";
import { vdomToDom } from "../vdom/vdomToDom.js";

/**
 * 요구사항:
 * - 4단계 Patch 적용 및 DOM 관리
 * - 실제 영역과 테스트 영역의 기본 렌더링 진입점을 제공한다.
 *
 * 관련 API:
 * - renderActualTree(root, tree): void
 * - renderTestTree(root, tree): void
 */

/**
 * 실제 영역 전체를 새 VDOM 기준으로 렌더링한다.
 */
export function renderActualTree(root: HTMLElement, tree: VNode): void {
  renderTree(root, tree);
}

/**
 * 테스트 영역 전체를 새 VDOM 기준으로 렌더링한다.
 */
export function renderTestTree(root: HTMLElement, tree: VNode): void {
  renderTree(root, tree);
}

function renderTree(root: HTMLElement, tree: VNode): void {
  // 같은 태그의 element를 루트 컨테이너로 쓰는 경우에는 속성과 자식만 동기화한다.
  if (tree.nodeType === "ELEMENT" && root.tagName.toLowerCase() === tree.tagName) {
    syncElementFromVNode(root, tree);
    return;
  }

  // 태그가 다르거나 text root인 경우에는 루트 내부를 새 DOM으로 교체한다.
  root.replaceChildren(vdomToDom(tree));
}
