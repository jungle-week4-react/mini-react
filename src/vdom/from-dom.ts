import {
  createElementNode,
  type ElementNodeProps,
  type ElementVNode,
} from './element-node.js';
import type { VNode } from './node.js';
import { createTextNode, type TextVNode } from './text-node.js';

const WHITESPACE_ONLY_TEXT_PATTERN = /^\s*$/;
const KEY_ATTRIBUTE_NAME = 'data-key';
const nodeUidMap = new WeakMap<Node, string>();
let domNodeUidSequence = 0;

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
    readElementKey(element),
    readNodeUid(element, 'element'),
  );
}

// props 읽어서 문자열 key, value 형태로 배열에 저장
function readElementProps(element: Element): ElementNodeProps {
  return Object.fromEntries(
    Array.from(element.attributes)
      .filter(({ name }) => name !== KEY_ATTRIBUTE_NAME)
      .map(({ name, value }) => [name, value]),
  );
}

function readElementKey(element: Element): string | null {
  return element.getAttribute(KEY_ATTRIBUTE_NAME);
}

function readNodeUid(
  node: Node,
  prefix: 'element' | 'text',
): string {
  const currentUid = nodeUidMap.get(node);

  if (currentUid !== undefined) {
    return currentUid;
  }

  domNodeUidSequence += 1;

  const nextUid = `dom-${prefix}:${domNodeUidSequence}`;

  nodeUidMap.set(node, nextUid);

  return nextUid;
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

  return createTextNode(value, readNodeUid(textNode, 'text'));
}
