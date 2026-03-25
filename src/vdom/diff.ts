import type { ElementNodeProps } from './element-node.js';
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

  // html 태그가 다른지 체크
  if (prev.tag !== next.tag) {
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

//자식 노드 비교 함수
function diffChildren(
  prevChildren: VNode[],
  nextChildren: VNode[],
  parentPath: VNodePath,
  patches: VNodePatch[],
): void {
  //prev랑 next 자식 길이 중 작은 값 저장
  const sharedLength = Math.min(prevChildren.length, nextChildren.length);

  // 자식 노드을을 차례차례 비교
  for (let index = 0; index < sharedLength; index += 1) {
    diffNode(
      prevChildren[index],
      nextChildren[index],
      parentPath.concat(index),
      patches,
    );
  }

  // old 노드 자식들 중 사라진게 있으면 삭제
  for (let index = prevChildren.length - 1; index >= sharedLength; index -= 1) {
    patches.push({
      type: 'remove',
      path: parentPath.concat(index),
    });
  }

  // new 노드 자식들 중 추가된게 있으면 추가
  for (let index = sharedLength; index < nextChildren.length; index += 1) {
    patches.push({
      type: 'insert',
      path: parentPath.concat(index),
      node: nextChildren[index],
    });
  }
}

// 현재 위치 저장
function clonePath(path: VNodePath): VNodePath {
  return path.slice();
}
