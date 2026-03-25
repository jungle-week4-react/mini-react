import {
  createElementNode,
  type ElementNodeProps,
  type ElementVNode,
} from './element-node.js';
import type { VNode } from './node.js';
import { createTextNode, type TextVNode } from './text-node.js';

const WHITESPACE_ONLY_TEXT_PATTERN = /^\s*$/;

function createVNodeFromNode(node: Node): VNode | null {
  if (node instanceof Element) {
    return createVNodeFromElement(node);
  }

  if (node instanceof Text) {
    return createTextVNodeFromText(node);
  }

  return null;
}

// 실제 DOM Element를 VNode로 변환
export function createVNodeFromElement(element: Element): ElementVNode {
  return createElementNode(
    element.tagName.toLowerCase(),
    readElementProps(element),
    readChildVNodes(element),
  );
}

// props 읽어서 문자열 key, value 형태로 배열에 저장
function readElementProps(element: Element): ElementNodeProps {
  return Object.fromEntries(
    Array.from(element.attributes, ({ name, value }) => [name, value]),
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

// 공백 text 노드이면 pass
function createTextVNodeFromText(textNode: Text): TextVNode | null {
  const value = textNode.nodeValue ?? '';

  if (WHITESPACE_ONLY_TEXT_PATTERN.test(value)) {
    return null;
  }

  return createTextNode(value);
}
