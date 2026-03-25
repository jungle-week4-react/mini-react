export type TextNodeUid = string;

// 텍스트 노드도 재조정 과정에서 안정적으로 식별할 수 있도록 uid를 발급한다.
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

// 런타임 타입 가드로 사용해 VNode가 텍스트 노드인지 구분한다.
export function isTextNode(node: unknown): node is TextVNode {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  return (node as { type?: unknown }).type === 'text';
}
