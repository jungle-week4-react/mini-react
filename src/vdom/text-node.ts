export type TextVNode = {
  type: 'text';
  value: string;
};

export const createTextNode = (value: string): TextVNode => ({
  type: 'text',
  value,
});

export const isTextNode = (node: unknown): node is TextVNode => {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  return (node as { type?: unknown }).type === 'text';
};
