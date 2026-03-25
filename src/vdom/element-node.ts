import type { TextVNode } from './text-node.js';

// Recode<string, string> key, value 둘 다 string 타입이 온다고 정의
export type ElementNodeProps = Record<string, string>;
export type ElementNodeKey = string | null;

export type ElementVNode = {
  type: 'element';
  tag: string;
  key: ElementNodeKey;
  props: ElementNodeProps;
  children: Array<ElementVNode | TextVNode>;
};

export function createElementNode(
  tag: string,
  props: ElementNodeProps = {},
  children: Array<ElementVNode | TextVNode> = [],
  key: ElementNodeKey = null,
): ElementVNode {
  return {
    type: 'element',
    tag,
    key,
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
