export type TextNodeUid = string;

let textNodeUidSequence = 0;

export type TextVNode = {
  type: 'text';
  uid: TextNodeUid;
  value: string;
};

export function createTextNode(
  value: string,
  uid: TextNodeUid = createTextNodeUid(),
): TextVNode {
  return {
    type: 'text',
    uid,
    value,
  };
}

function createTextNodeUid(): TextNodeUid {
  textNodeUidSequence += 1;

  return `text:${textNodeUidSequence}`;
}

export function isTextNode(node: unknown): node is TextVNode {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  return (node as { type?: unknown }).type === 'text';
}
