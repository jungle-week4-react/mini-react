export type { VNodePatch, VNodePath } from './vdom/diff.js';
export type {
  CreateElementNodeOptions,
  ElementNodeProps,
  ElementVNode,
  VNodeKey,
} from './vdom/element-node.js';
export type { VNode } from './vdom/node.js';
export type { TextVNode } from './vdom/text-node.js';
export { applyPatch, applyPatches } from './vdom/apply-patch.js';
export { diffVNode } from './vdom/diff.js';
export { createElementNode, isElementNode } from './vdom/element-node.js';
export { createDOMNodeFromVNode } from './vdom/dom.js';
export { createVNodeFromElement } from './vdom/from-dom.js';
export { createTextNode, isTextNode } from './vdom/text-node.js';
export {
  applyPatches as applyContainerPatches,
  createDOMNodeFromVNode as createDomNodeFromVNode,
  mountVNode,
} from './vdom/dom.js';
