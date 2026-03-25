import type { TextVNode } from './text-node.js';

// key는 형제 노드 사이에서 같은 노드를 식별하기 위한 값이다.
export type VNodeKey = string;

// Record<string, string>은 key와 value가 모두 string인 객체를 의미한다.
export type ElementNodeProps = Record<string, string>;
export type ElementNodeChildren = Array<ElementVNode | TextVNode>;

export type ElementVNode = {
  type: 'element';
  tag: string;
  key: VNodeKey | null;
  props: ElementNodeProps;
  children: ElementNodeChildren;
};

export type CreateElementNodeOptions = {
  key?: VNodeKey | null;
  props?: ElementNodeProps;
  children?: ElementNodeChildren;
};

export function createElementNode(
  tag: string,
  options: CreateElementNodeOptions = {},
): ElementVNode {
  const {
    key,
    props = {},
    children = [],
  } = options;

  return {
    type: 'element',
    tag,
    key: normalizeVNodeKey(key),
    props,
    children,
  };
}

export function isElementNode(node: unknown): node is ElementVNode {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  return (node as { type?: unknown }).type === 'element';
}

function normalizeVNodeKey(key: VNodeKey | null | undefined): VNodeKey | null {
  if (key === '' || key === null || key === undefined) {
    return null;
  }

  return key;
}
