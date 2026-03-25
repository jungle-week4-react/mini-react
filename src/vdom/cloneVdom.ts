import type { VNode } from "../types.js";

/**
 * 요구사항:
 * - 2단계 트리 생성 메서드 구현
 * - History 저장용 깊은 복사 메서드를 구현한다.
 *
 * 관련 API:
 * - cloneVdom(tree: VNode): VNode
 */

/**
 * History에 저장할 때 참조 공유를 막기 위해 Virtual DOM 트리를 깊은 복사한다.
 * VNode는 순수 데이터 구조만 가지므로 structuredClone을 안전하게 사용할 수 있다.
 */
export function cloneVdom(tree: VNode): VNode {
  // snapshot끼리 참조가 섞이지 않도록 깊은 복사를 보장한다.
  return structuredClone(tree);
}
