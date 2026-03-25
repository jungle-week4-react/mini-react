import type { TextVNode } from './text-node.js';

// 속성은 문자열 key/value 쌍만 다루도록 단순화한다.
export type ElementNodeProps = Record<string, string>;
export type ElementNodeKey = string | null;
export type ElementNodeUid = string;

// key가 없는 element도 안정적으로 추적할 수 있도록 uid를 발급한다.
let elementNodeUidSequence = 0;

export type ElementVNode = {
  type: 'element';
  tag: string;
  key: ElementNodeKey;
  uid: ElementNodeUid;
  props: ElementNodeProps;
  children: Array<ElementVNode | TextVNode>;
};

export function createElementNode(
  tag: string,
  props: ElementNodeProps = {},
  children: Array<ElementVNode | TextVNode> = [],
  key: ElementNodeKey = null,
  uid: ElementNodeUid = createElementNodeUid(),
): ElementVNode {
  return {
    type: 'element',
    tag,
    key,
    uid,
    props,
    children,
  };
}

function createElementNodeUid(): ElementNodeUid {
  elementNodeUidSequence += 1;

  return `element:${elementNodeUidSequence}`;
}

// 런타임 타입 가드로 사용해 VNode가 엘리먼트 노드인지 구분한다.
export function isElementNode(node: unknown): node is ElementVNode {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  return (node as { type?: unknown }).type === 'element';
}
