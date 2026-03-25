export type TextVNode = {
  type: 'text';
  value: string;
};

export function createTextNode(value: string): TextVNode {
  return {
    type: 'text',
    value,
  };
}

export function isTextNode(node: unknown): node is TextVNode {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  return (node as { type?: unknown }).type === 'text';
}
