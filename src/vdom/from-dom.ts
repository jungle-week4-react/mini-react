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

// DOM Node를 읽어 대응되는 VNode로 변환한다.
function createVNodeFromNode(node: Node): VNode | null {
  if (node instanceof Element) {
    return createVNodeFromElement(node);
  }

  if (node instanceof Text) {
    return createTextVNodeFromText(node);
  }

  return null;
}

// 실제 DOM Element를 props, children, key 정보가 담긴 VNode로 변환한다.
export function createVNodeFromElement(element: Element): ElementVNode {
  return createElementNode(
    element.tagName.toLowerCase(),
    readElementProps(element),
    readChildVNodes(element),
    readElementKey(element),
    readNodeUid(element, 'element'),
  );
}

// data-key를 제외한 attribute만 일반 props로 읽는다.
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

// 실제 DOM 노드와 VNode 사이의 대응 관계를 유지하기 위해 uid를 재사용한다.
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

// childNodes를 순회하면서 변환 가능한 노드만 자식 VNode로 수집한다.
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

// 공백만 있는 텍스트는 레이아웃용 개행일 가능성이 높아 VDOM에서 제외한다.
function createTextVNodeFromText(textNode: Text): TextVNode | null {
  const value = textNode.nodeValue ?? '';

  if (WHITESPACE_ONLY_TEXT_PATTERN.test(value)) {
    return null;
  }

  return createTextNode(value, readNodeUid(textNode, 'text'));
}
