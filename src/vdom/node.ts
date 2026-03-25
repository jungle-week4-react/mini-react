import type { ElementVNode } from './element-node.js';
import type { TextVNode } from './text-node.js';

// mini-react가 다루는 모든 가상 노드의 공용 타입이다.
export type VNode = ElementVNode | TextVNode;
