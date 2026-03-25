import {
  createElementNode,
  type ElementNodeProps,
  type ElementVNode,
} from './element-node.js';
import type { VNode } from './node.js';
import { createTextNode, type TextVNode } from './text-node.js';

// 공백만 있는 텍스트 노드는 화면 구조 이해를 방해하므로 무시한다.
const WHITESPACE_ONLY_TEXT_PATTERN = /^\s*$/;
// HTML에서 key를 실험할 때 data-key 속성을 key로 읽는다.
const KEY_ATTRIBUTE_NAME = 'data-key';
// 실제 DOM Node 객체마다 내부 uid를 안정적으로 보존하기 위한 저장소다.
const nodeUidMap = new WeakMap<Node, string>();
let domNodeUidSequence = 0;

// DOM Node 하나를 보고 어떤 종류의 VNode로 바꿔야 하는지 분기한다.
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
// 결과 VNode는 이후 render -> Fiber -> diff -> commit 흐름의 입력이 된다.
export function createVNodeFromElement(element: Element): ElementVNode {
  return createElementNode(
    element.tagName.toLowerCase(),
    readElementProps(element),
    readChildVNodes(element),
    readElementKey(element),
    readNodeUid(element, 'element'),
  );
}

// attribute를 읽어 props 객체로 변환한다.
// data-key는 key 용도라 props에서는 제외한다.
function readElementProps(element: Element): ElementNodeProps {
  return Object.fromEntries(
    Array.from(element.attributes)
      .filter(({ name }) => name !== KEY_ATTRIBUTE_NAME)
      .map(({ name, value }) => [name, value]),
  );
}

// data-key를 개발자 key로 읽는다.
function readElementKey(element: Element): string | null {
  return element.getAttribute(KEY_ATTRIBUTE_NAME);
}

function readNodeUid(
  node: Node,
  prefix: 'element' | 'text',
): string {
  // 이미 읽은 DOM 노드면 같은 uid를 다시 돌려준다.
  const currentUid = nodeUidMap.get(node);

  if (currentUid !== undefined) {
    return currentUid;
  }

  // 처음 보는 DOM 노드면 새 uid를 만들고 WeakMap에 저장한다.
  domNodeUidSequence += 1;

  const nextUid = `dom-${prefix}:${domNodeUidSequence}`;

  nodeUidMap.set(node, nextUid);

  return nextUid;
}

// childNodes를 순서대로 읽어 자식 VNode 배열로 만든다.
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

// Text DOM을 TextVNode로 바꾼다.
// 공백-only text는 의미 없는 노드로 보고 버린다.
function createTextVNodeFromText(textNode: Text): TextVNode | null {
  const value = textNode.nodeValue ?? '';

  if (WHITESPACE_ONLY_TEXT_PATTERN.test(value)) {
    return null;
  }

  return createTextNode(value, readNodeUid(textNode, 'text'));
}
