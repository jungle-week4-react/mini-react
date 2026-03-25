import type { VNode } from './node.js';

const KEY_ATTRIBUTE_NAME = 'key';

// vnode로 DOM 만들어주는 함수
export function createDOMNodeFromVNode(
  vnode: VNode,
  domDocument?: Document,
): Node {
  // document 에러 핸들링
  const resolvedDocument = resolveDocument(domDocument);

  if (vnode.type === 'text') {
    return resolvedDocument.createTextNode(vnode.value);
  }

  // 노드 태그 기준으로 dom element 생성
  const element = resolvedDocument.createElement(vnode.tag);

  // 키 가있으면 attribute에 추가
  if (vnode.key !== null) {
    element.setAttribute(KEY_ATTRIBUTE_NAME, vnode.key);
  }

  // props attribute에 차례차례 추가
  for (const [name, value] of Object.entries(vnode.props)) {
    element.setAttribute(name, value);
  }

  // 자식들 추가
  for (const child of vnode.children) {
    element.appendChild(createDOMNodeFromVNode(child, resolvedDocument));
  }

  return element;
}

function resolveDocument(domDocument?: Document): Document {
  if (domDocument !== undefined) {
    return domDocument;
  }

  if (globalThis.document !== undefined) {
    return globalThis.document;
  }

  throw new Error('Cannot create DOM node without a Document instance');
}
