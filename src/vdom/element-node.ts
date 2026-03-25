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
  props?: ElementNodeProps,
  children?: ElementNodeChildren,
): ElementVNode;

export function createElementNode(
  tag: string,
  options?: CreateElementNodeOptions,
): ElementVNode;

export function createElementNode(
  tag: string,
  propsOrOptions?: ElementNodeProps | CreateElementNodeOptions,
  children?: ElementNodeChildren,
): ElementVNode {
  const normalizedOptions = normalizeCreateElementNodeOptions(
    propsOrOptions,
    children,
  );

  return {
    type: 'element',
    tag,
    key: normalizedOptions.key,
    props: normalizedOptions.props,
    children: normalizedOptions.children,
  };
}

export function isElementNode(node: unknown): node is ElementVNode {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  return (node as { type?: unknown }).type === 'element';
}

function normalizeCreateElementNodeOptions(
  input: ElementNodeProps | CreateElementNodeOptions = {},
  legacyChildren: ElementNodeChildren = [],
): CreateElementNodeOptions & {
  key: VNodeKey | null;
  props: ElementNodeProps;
  children: ElementNodeChildren;
} {
  if (hasCreateElementNodeOptionShape(input)) {
    return {
      key: input.key ?? null,
      props: input.props ?? {},
      children: input.children ?? legacyChildren,
    };
  }

  return {
    key: null,
    props: input,
    children: legacyChildren,
  };
}

// key, props, children 중 하나라도 있으면 새 옵션 형태로 간주한다.
function hasCreateElementNodeOptionShape(
  value: ElementNodeProps | CreateElementNodeOptions,
): value is CreateElementNodeOptions {
  return (
    Object.hasOwn(value, 'key') ||
    Object.hasOwn(value, 'props') ||
    Object.hasOwn(value, 'children')
  );
}
