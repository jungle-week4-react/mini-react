import type { ElementNodeProps, ElementVNode } from './element-node.js';
import type { VNode } from './node.js';

export type VNodePath = number[];

/**
 * replace: path의 노드에 node를 제거해라
 * insert: path의 노드에 새 자식을 추가해라
 * remove: path의 노드를 제거해라
 * text: path위치의 text를 value로 바꿔라
 * props: path위치의 element의 props를 remove를 지우고 set을 추가해라
 */
export type VNodePatch =
  | { type: 'replace'; path: VNodePath; node: VNode }
  | { type: 'insert'; path: VNodePath; node: VNode }
  | { type: 'remove'; path: VNodePath }
  | { type: 'text'; path: VNodePath; value: string }
  | {
      type: 'props';
      path: VNodePath;
      set: Record<string, string>;
      remove: string[];
    };

// 이전 vdom이랑 다음 vdom 을 비교하는 함수
export function diffVNode(prev: VNode, next: VNode): VNodePatch[] {
  const patches: VNodePatch[] = [];

  diffNode(prev, next, [], patches);

  return patches;
}

// 현재 노드를 비교
function diffNode(
  prev: VNode,
  next: VNode,
  path: VNodePath,
  patches: VNodePatch[],
): void {
  // element인지 text인지 체크
  if (prev.type !== next.type) {
    patches.push({
      type: 'replace',
      path: clonePath(path),
      node: next,
    });
    return;
  }

  // text 노드의 문자열이 같은지 체크
  if (prev.type === 'text' && next.type === 'text') {
    if (prev.value !== next.value) {
      patches.push({
        type: 'text',
        path: clonePath(path),
        value: next.value,
      });
    }

    return;
  }

  // element도 text도 아닌 타입이면 return
  if (prev.type !== 'element' || next.type !== 'element') {
    return;
  }

  // 태그가 다르거나 key가 다르면 같은 노드로 볼 수 없다.
  if (prev.tag !== next.tag || prev.key !== next.key) {
    patches.push({
      type: 'replace',
      path: clonePath(path),
      node: next,
    });
    return;
  }

  // props가 다른지 체크
  const propsPatch = diffProps(prev.props, next.props, path);

  if (propsPatch !== null) {
    patches.push(propsPatch);
  }

  // children이 다른지 체크
  diffChildren(prev.children, next.children, path, patches);
}

// Extract<VNodePatch, { type: 'props' }> VNodePatch에서 'props' 타입만 추출
function diffProps(
  prevProps: ElementNodeProps,
  nextProps: ElementNodeProps,
  path: VNodePath,
): Extract<VNodePatch, { type: 'props' }> | null {
  const set: Record<string, string> = {};

  // 각각의 prop의 key를 확인해서 prop의 value가 다르면 set에 추가
  for (const key of Object.keys(nextProps).sort()) {
    if (prevProps[key] !== nextProps[key]) {
      set[key] = nextProps[key];
    }
  }

  // nextProps에 prevProps의 key값이 없으면 remove에 추가
  const remove = Object.keys(prevProps)
    .sort()
    .filter((key) => !Object.hasOwn(nextProps, key));

  if (Object.keys(set).length === 0 && remove.length === 0) {
    return null;
  }

  return {
    type: 'props',
    path: clonePath(path),
    set,
    remove,
  };
}

// 자식 노드는 keyed diff를 우선 시도하고, 조건이 맞지 않으면 index 기반 비교로 돌아간다.
function diffChildren(
  prevChildren: VNode[],
  nextChildren: VNode[],
  parentPath: VNodePath,
  patches: VNodePatch[],
): void {
  if (canUseKeyedDiff(prevChildren, nextChildren)) {
    diffKeyedChildren(prevChildren, nextChildren, parentPath, patches);
    return;
  }

  diffIndexedChildren(prevChildren, nextChildren, parentPath, patches);
}

function diffIndexedChildren(
  prevChildren: VNode[],
  nextChildren: VNode[],
  parentPath: VNodePath,
  patches: VNodePatch[],
): void {
  // prev랑 next 자식 길이 중 작은 값을 저장한다.
  const sharedLength = Math.min(prevChildren.length, nextChildren.length);

  // 자식 노드를 같은 인덱스끼리 차례대로 비교한다.
  for (let index = 0; index < sharedLength; index += 1) {
    diffNode(
      prevChildren[index],
      nextChildren[index],
      parentPath.concat(index),
      patches,
    );
  }

  // remove는 뒤에서부터 처리해야 인덱스가 덜 흔들린다.
  for (let index = prevChildren.length - 1; index >= sharedLength; index -= 1) {
    patches.push({
      type: 'remove',
      path: parentPath.concat(index),
    });
  }

  // 새로 생긴 자식은 현재 next 인덱스 기준으로 insert 한다.
  for (let index = sharedLength; index < nextChildren.length; index += 1) {
    patches.push({
      type: 'insert',
      path: parentPath.concat(index),
      node: nextChildren[index],
    });
  }
}

// key가 안전하게 있는 element 자식들만 keyed diff 대상으로 삼는다.
function canUseKeyedDiff(prevChildren: VNode[], nextChildren: VNode[]): boolean {
  if (!hasOnlyKeyedElementChildren(prevChildren)) {
    return false;
  }

  if (!hasOnlyKeyedElementChildren(nextChildren)) {
    return false;
  }

  if (!hasUniqueKeys(prevChildren) || !hasUniqueKeys(nextChildren)) {
    return false;
  }

  // 현재 patch 모델에는 move가 없으므로
  // 공유 key의 상대 순서가 바뀐 경우는 index diff로 되돌린다.
  return !hasReorderedSharedKeys(prevChildren, nextChildren);
}

function diffKeyedChildren(
  prevChildren: VNode[],
  nextChildren: VNode[],
  parentPath: VNodePath,
  patches: VNodePatch[],
): void {
  const prevKeyedChildren = prevChildren as Array<ElementVNode & { key: string }>;
  const nextKeyedChildren = nextChildren as Array<ElementVNode & { key: string }>;

  const prevKeySet = new Set(prevKeyedChildren.map((child) => child.key));
  const nextChildrenByKey = new Map(
    nextKeyedChildren.map((child) => [child.key, child] as const),
  );

  // 같은 key를 가진 노드는 같은 노드로 보고 재귀 비교한다.
  // path는 이전 트리 기준 위치를 유지한다.
  for (let index = 0; index < prevKeyedChildren.length; index += 1) {
    const prevChild = prevKeyedChildren[index];
    const nextChild = nextChildrenByKey.get(prevChild.key);

    if (nextChild !== undefined) {
      diffNode(prevChild, nextChild, parentPath.concat(index), patches);
    }
  }

  // 이전에는 있었지만 다음에는 사라진 key는 remove 처리한다.
  for (let index = prevKeyedChildren.length - 1; index >= 0; index -= 1) {
    const prevChild = prevKeyedChildren[index];

    if (!nextChildrenByKey.has(prevChild.key)) {
      patches.push({
        type: 'remove',
        path: parentPath.concat(index),
      });
    }
  }

  // 다음에 새로 등장한 key는 insert 처리한다.
  for (let index = 0; index < nextKeyedChildren.length; index += 1) {
    const nextChild = nextKeyedChildren[index];

    if (!prevKeySet.has(nextChild.key)) {
      patches.push({
        type: 'insert',
        path: parentPath.concat(index),
        node: nextChild,
      });
    }
  }
}

function hasOnlyKeyedElementChildren(
  children: VNode[],
): children is Array<ElementVNode & { key: string }> {
  return children.every(
    (child): child is ElementVNode & { key: string } =>
      child.type === 'element' && child.key !== null,
  );
}

function hasUniqueKeys(children: Array<ElementVNode & { key: string }>): boolean {
  return new Set(children.map((child) => child.key)).size === children.length;
}

function hasReorderedSharedKeys(
  prevChildren: Array<ElementVNode & { key: string }>,
  nextChildren: Array<ElementVNode & { key: string }>,
): boolean {
  const nextKeySet = new Set(nextChildren.map((child) => child.key));
  const prevKeySet = new Set(prevChildren.map((child) => child.key));

  const prevSharedKeys = prevChildren
    .map((child) => child.key)
    .filter((key) => nextKeySet.has(key));

  const nextSharedKeys = nextChildren
    .map((child) => child.key)
    .filter((key) => prevKeySet.has(key));

  if (prevSharedKeys.length !== nextSharedKeys.length) {
    return true;
  }

  return prevSharedKeys.some((key, index) => key !== nextSharedKeys[index]);
}

// 현재 위치를 복사해서 patch에 저장한다.
function clonePath(path: VNodePath): VNodePath {
  return path.slice();
}
