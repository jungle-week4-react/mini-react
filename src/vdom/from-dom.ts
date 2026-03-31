import {
  createElementNode,
  type ElementNodeProps,
  type ElementVNode,
} from './element-node.js';
import type { VNode } from './node.js';
import { createTextNode, type TextVNode } from './text-node.js';

// 줄바꿈/들여쓰기처럼 화면 의미가 없는 공백 text node는 VDOM에서 제외한다.
const WHITESPACE_ONLY_TEXT_PATTERN = /^\s*$/;
const KEY_ATTRIBUTE_NAME = 'key';
const DATA_KEY_ATTRIBUTE_NAME = 'data-key';

// DOM Node를 VNode로 바꿀 때 node 종류에 따라 element / text 변환기를 나눈다.
function createVNodeFromNode(node: Node): VNode | null {
  if (node instanceof Element) {
    return createVNodeFromElement(node);
  }

  if (node instanceof Text) {
    return createTextVNodeFromText(node);
  }

  return null;
}

// 실제 DOM Element를 VNode로 변환한다.
// key는 형제 식별용 메타데이터라 props와 분리해서 별도 필드에 저장한다.
export function createVNodeFromElement(element: Element): ElementVNode {
  return createElementNode(element.tagName.toLowerCase(), {
    key: readElementKey(element),
    props: readElementProps(element),
    children: readChildVNodes(element),
  });
}

// 브라우저 DOM에서 key 역할을 하는 속성을 읽어 내부 key로 정규화한다.
// 이제 key를 표준으로 읽고, 기존 data-key는 호환용 fallback으로만 허용한다.
function readElementKey(element: Element): string | null {
  const value = element.getAttribute(KEY_ATTRIBUTE_NAME)
    ?? element.getAttribute(DATA_KEY_ATTRIBUTE_NAME);

  if (value !== null && value !== '') {
    return value;
  }

  return null;
}

// key 관련 속성은 diff 비교용 메타데이터이므로 일반 props 목록에서는 제외한다.
function readElementProps(element: Element): ElementNodeProps {
  return Object.fromEntries(
    Array.from(element.attributes)
      .filter(({ name }) => !isKeyAttributeName(name))
      .map(({ name, value }) => [name, value]),
  );
}

// 자식 DOM Node를 순서대로 읽어서 VNode 배열로 만든다.
// comment 등 변환 대상이 아닌 노드는 null이므로 건너뛴다.
function readChildVNodes(element: Element): VNode[] {
  const childVNodes: VNode[] = [];

  for (const childNode of element.childNodes) {
    const childVNode = createVNodeFromNode(childNode);

    if (childVNode !== null) {
      childVNodes.push(childVNode);
    }
  }

  return childVNodes;
}

// 공백만 있는 text node는 들여쓰기용인 경우가 많아서 VDOM 비교 대상으로 삼지 않는다.
function createTextVNodeFromText(textNode: Text): TextVNode | null {
  const value = textNode.nodeValue ?? '';

  if (WHITESPACE_ONLY_TEXT_PATTERN.test(value)) {
    return null;
  }

  return createTextNode(value);
}

// key 관련 속성 이름을 한곳에서 관리해 props 필터와 key 추출 로직이 어긋나지 않게 한다.
function isKeyAttributeName(name: string): boolean {
  return name === KEY_ATTRIBUTE_NAME || name === DATA_KEY_ATTRIBUTE_NAME;
}
