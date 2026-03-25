export type { VNodePatch, VNodePath } from './vdom/diff.js';
export type {
  CreateElementNodeOptions,
  ElementNodeProps,
  ElementVNode,
  VNodeKey,
} from './vdom/element-node.js';
export type { VNode } from './vdom/node.js';
export type { TextVNode } from './vdom/text-node.js';
export { diffVNode } from './vdom/diff.js';
export { createElementNode, isElementNode } from './vdom/element-node.js';
export { createVNodeFromElement } from './vdom/from-dom.js';
export { createTextNode, isTextNode } from './vdom/text-node.js';
