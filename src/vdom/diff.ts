import type { ElementNodeProps, ElementVNode } from './element-node.js';
import type { VNode } from './node.js';

// path는 루트에서 시작해 childNodes 인덱스를 따라가는 위치 정보다.
export type VNodePath = number[];

/**
 * diff 결과는 실제 DOM 적용기가 이해할 수 있는 최소 단위 patch 목록으로 표현한다.
 * replace: path 위치 노드를 새 node 하나로 통째로 교체한다.
 * insert: path 위치에 새 자식을 삽입한다.
 * remove: path 위치 노드를 제거한다.
 * text: path 위치 text node의 문자열만 바꾼다.
 * props: path 위치 element의 속성 중 remove는 삭제하고 set은 추가/수정한다.
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

// 이전 VDOM과 다음 VDOM을 비교해 patch 목록을 만든다.
export function diffVNode(prev: VNode, next: VNode): VNodePatch[] {
  const patches: VNodePatch[] = [];

  diffNode(prev, next, [], patches);

  return patches;
}

// 현재 위치의 두 노드를 비교해 필요한 patch를 patches 배열에 누적한다.
function diffNode(
  prev: VNode,
  next: VNode,
  path: VNodePath,
  patches: VNodePatch[],
): void {
  // 노드 타입 자체가 다르면 더 세밀한 비교 없이 교체가 가장 안전하다.
  if (prev.type !== next.type) {
    patches.push({
      type: 'replace',
      path: clonePath(path),
      node: next,
    });
    return;
  }

  // text node는 값 하나만 비교하면 된다.
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

  // 현재 VNode 모델은 text / element 두 종류만 있으므로 여기까지 오면 방어적으로 종료한다.
  if (prev.type !== 'element' || next.type !== 'element') {
    return;
  }

  // 태그가 다르거나 key가 다르면 같은 노드로 재사용할 수 없다고 본다.
  if (prev.tag !== next.tag || prev.key !== next.key) {
    patches.push({
      type: 'replace',
      path: clonePath(path),
      node: next,
    });
    return;
  }

  // 같은 element라면 먼저 props 차이를 계산한다.
  const propsPatch = diffProps(prev.props, next.props, path);

  if (propsPatch !== null) {
    patches.push(propsPatch);
  }

  // 그 다음 자식 목록을 비교한다.
  diffChildren(prev.children, next.children, path, patches);
}

// props patch만 반환하는 헬퍼.
// set에는 새로 추가되거나 값이 바뀐 속성만, remove에는 사라진 속성만 담는다.
function diffProps(
  prevProps: ElementNodeProps,
  nextProps: ElementNodeProps,
  path: VNodePath,
): Extract<VNodePatch, { type: 'props' }> | null {
  const set: Record<string, string> = {};

  // next props를 기준으로 새 값이 필요한 속성을 모은다.
  for (const key of Object.keys(nextProps).sort()) {
    if (prevProps[key] !== nextProps[key]) {
      set[key] = nextProps[key];
    }
  }

  // 이전에는 있었지만 다음에는 사라진 속성은 remove 목록에 넣는다.
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

// 자식 비교는 keyed diff를 우선 시도한다.
// 다만 현재 patch 모델에는 move가 없기 때문에 안전한 경우에만 keyed diff를 사용한다.
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

// 가장 단순한 자식 비교 방식.
// 같은 인덱스끼리 비교하고, 남는 뒤쪽 노드는 remove/insert로 처리한다.
function diffIndexedChildren(
  prevChildren: VNode[],
  nextChildren: VNode[],
  parentPath: VNodePath,
  patches: VNodePatch[],
): void {
  // 서로 겹치는 구간까지만 같은 인덱스로 비교한다.
  const sharedLength = Math.min(prevChildren.length, nextChildren.length);

  // 공통 구간은 재귀적으로 내려가며 차이를 찾는다.
  for (let index = 0; index < sharedLength; index += 1) {
    diffNode(
      prevChildren[index],
      nextChildren[index],
      parentPath.concat(index),
      patches,
    );
  }

  // remove는 뒤에서부터 지워야 앞쪽 인덱스가 흔들리지 않는다.
  for (let index = prevChildren.length - 1; index >= sharedLength; index -= 1) {
    patches.push({
      type: 'remove',
      path: parentPath.concat(index),
    });
  }

  // 다음 트리에만 있는 새 자식은 next 인덱스 기준으로 삽입한다.
  for (let index = sharedLength; index < nextChildren.length; index += 1) {
    patches.push({
      type: 'insert',
      path: parentPath.concat(index),
      node: nextChildren[index],
    });
  }
}

// keyed diff는 "모든 자식이 key 있는 element"이고 "key가 유일"하며
// "공유 key의 상대 순서가 유지"되는 경우에만 사용한다.
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

// 같은 key를 가진 자식끼리 연결해서 비교한다.
// move patch가 없기 때문에 상대 순서는 그대로라는 전제가 있다.
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

  // 같은 key를 가진 노드는 "같은 의미의 노드"라고 보고 재귀 비교한다.
  // path는 실제 DOM 기준이므로 이전 트리의 인덱스를 유지해야 한다.
  for (let index = 0; index < prevKeyedChildren.length; index += 1) {
    const prevChild = prevKeyedChildren[index];
    const nextChild = nextChildrenByKey.get(prevChild.key);

    if (nextChild !== undefined) {
      diffNode(prevChild, nextChild, parentPath.concat(index), patches);
    }
  }

  // 이전 트리에만 있던 key는 제거 대상이다.
  for (let index = prevKeyedChildren.length - 1; index >= 0; index -= 1) {
    const prevChild = prevKeyedChildren[index];

    if (!nextChildrenByKey.has(prevChild.key)) {
      patches.push({
        type: 'remove',
        path: parentPath.concat(index),
      });
    }
  }

  // 다음 트리에만 새로 등장한 key는 삽입 대상이다.
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

// keyed diff를 쓰려면 자식 전부가 key 있는 element여야 한다.
function hasOnlyKeyedElementChildren(
  children: VNode[],
): children is Array<ElementVNode & { key: string }> {
  return children.every(
    (child): child is ElementVNode & { key: string } =>
      child.type === 'element' && child.key !== null,
  );
}

// key 중복이 있으면 어느 노드를 재사용해야 하는지 모호해지므로 금지한다.
function hasUniqueKeys(children: Array<ElementVNode & { key: string }>): boolean {
  return new Set(children.map((child) => child.key)).size === children.length;
}

// move patch를 지원하지 않기 때문에
// 두 트리에서 공유 key의 상대 순서가 바뀌었는지 미리 검사한다.
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

// path 배열은 재귀 중 재사용되므로 patch에 넣기 전에 복사본을 저장한다.
function clonePath(path: VNodePath): VNodePath {
  return path.slice();
}
