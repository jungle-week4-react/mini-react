import type { TextVNode } from './text-node.js';

export type ElementNodeProps = Record<string, string>;

export type ElementVNode = {
  type: 'element';
  tag: string;
  props: ElementNodeProps;
  children: Array<ElementVNode | TextVNode>;
};

export function createElementNode(
  tag: string,
  props: ElementNodeProps = {},
  children: Array<ElementVNode | TextVNode> = [],
): ElementVNode {
  return {
    type: 'element',
    tag,
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
