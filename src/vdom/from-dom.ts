import {
  createElementNode,
  type ElementNodeProps,
  type ElementVNode,
} from './element-node.js';
import type { VNode } from './node.js';
import { createTextNode, type TextVNode } from './text-node.js';

const WHITESPACE_ONLY_TEXT_PATTERN = /^\s*$/;
const KEY_ATTRIBUTE_NAMES = ['data-vdom-key', 'data-key'] as const;

type KeyAttributeName = (typeof KEY_ATTRIBUTE_NAMES)[number];

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
// key는 props와 분리해서 읽는다.
export function createVNodeFromElement(element: Element): ElementVNode {
  return createElementNode(element.tagName.toLowerCase(), {
    key: readElementKey(element),
    props: readElementProps(element),
    children: readChildVNodes(element),
  });
}

// key용 attribute를 읽어서 내부 key로 사용한다.
function readElementKey(element: Element): string | null {
  for (const attributeName of KEY_ATTRIBUTE_NAMES) {
    const value = element.getAttribute(attributeName);

    if (value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

// key는 내부 식별자이므로 props 비교 대상에서는 제외한다.
function readElementProps(element: Element): ElementNodeProps {
  return Object.fromEntries(
    Array.from(element.attributes)
      .filter(({ name }) => !isKeyAttributeName(name))
      .map(({ name, value }) => [name, value]),
  );
}

// childNode를 읽어서 배열에 저장
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

// 공백만 있는 text node는 의미 있는 UI 변경이 아니므로 제외한다.
function createTextVNodeFromText(textNode: Text): TextVNode | null {
  const value = textNode.nodeValue ?? '';

  if (WHITESPACE_ONLY_TEXT_PATTERN.test(value)) {
    return null;
  }

  return createTextNode(value);
}

function isKeyAttributeName(name: string): name is KeyAttributeName {
  return KEY_ATTRIBUTE_NAMES.includes(name as KeyAttributeName);
}
