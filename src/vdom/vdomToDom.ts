import type { VNode } from "../types.js";

/**
 * 요구사항:
 * - 2단계 트리 생성 메서드 구현
 * - Virtual DOM을 실제 DOM으로 복원하는 메서드를 구현한다.
 * - key를 포함한 노드 구조를 브라우저 DOM으로 되돌린다.
 *
 * 관련 API:
 * - vdomToDom(vnode: VNode): Node
 */

/**
 * Virtual DOM 노드를 실제 DOM Node로 복원한다.
 * undo/redo 복원과 테스트 영역 초기 렌더의 공통 진입점으로 사용한다.
 */
export function vdomToDom(vnode: VNode): Node {
  // Text VNode는 가장 단순한 브라우저 Text 노드로 복원한다.
  if (vnode.nodeType === "TEXT") {
    return document.createTextNode(vnode.textContent);
  }

  // tagName을 기준으로 실제 Element를 생성한다.
  const element = document.createElement(vnode.tagName);

  // key는 다음 DOM -> VDOM 변환에서도 읽을 수 있도록 attribute로 유지한다.
  if (vnode.key !== null) {
    element.setAttribute("key", vnode.key);
  }

  // 일반 속성을 실제 DOM attribute로 복원한다.
  for (const [name, value] of Object.entries(vnode.props)) {
    element.setAttribute(name, value);
  }

  // 자식 VNode를 순서대로 복원해 원래 트리 구조를 재구성한다.
  for (const child of vnode.children) {
    element.appendChild(vdomToDom(child));
  }

  return element;
}
