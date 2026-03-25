import type { VElementNode, VNode, VTextNode } from "../types.js";

/**
 * 요구사항:
 * - 2단계 트리 생성 메서드 구현
 * - 실제 DOM을 Virtual DOM으로 변환하는 메서드를 구현한다.
 * - key attribute를 읽고 props와 분리한다.
 *
 * 관련 API:
 * - domToVdom(node: Node): VNode | null
 */

/**
 * DOM 노드를 비교 가능한 Virtual DOM 노드로 변환한다.
 * 줄바꿈/들여쓰기만 있는 공백 텍스트 노드는 diff 노이즈를 줄이기 위해 제외한다.
 */
export function domToVdom(node: Node): VNode | null {
  // 텍스트 노드는 내용만 보존하는 별도 VNode로 변환한다.
  if (node.nodeType === Node.TEXT_NODE) {
    return createTextVNode(node);
  }

  // Element 노드는 tag, key, props, children을 모두 추출한다.
  if (node.nodeType === Node.ELEMENT_NODE) {
    return createElementVNode(node as HTMLElement);
  }

  return null;
}

function createTextVNode(node: Node): VTextNode | null {
  // null 가능성을 없애고 이후 비교 로직에서 일관되게 다루기 위한 문자열 값이다.
  const textContent = node.textContent ?? "";

  // 들여쓰기/줄바꿈만 있는 텍스트는 렌더링 차이를 흐리므로 제외한다.
  if (textContent.trim() === "") {
    return null;
  }

  return {
    nodeType: "TEXT",
    key: null,
    textContent,
  };
}

function createElementVNode(element: HTMLElement): VElementNode {
  // key는 형제 노드 식별자로 별도 필드에 보관한다.
  const key = element.getAttribute("key");
  // props는 key를 제외한 일반 attribute만 담는다.
  const props = extractProps(element);
  // childNodes 전체를 순회해 재귀적으로 VDOM 트리를 만든다.
  const children = Array.from(element.childNodes)
    .map((childNode) => domToVdom(childNode))
    .filter((child): child is VNode => child !== null);

  return {
    nodeType: "ELEMENT",
    tagName: element.tagName.toLowerCase(),
    key,
    props,
    children,
  };
}

function extractProps(element: HTMLElement): Record<string, string> {
  // DOM attribute를 순회하며 key를 제외한 나머지만 저장한다.
  const props: Record<string, string> = {};

  for (const attribute of Array.from(element.attributes)) {
    // key는 diff 식별자이므로 일반 props에 넣지 않는다.
    if (attribute.name === "key") {
      continue;
    }

    // 실제 렌더링에 필요한 일반 HTML 속성 값이다.
    props[attribute.name] = attribute.value;
  }

  return props;
}
