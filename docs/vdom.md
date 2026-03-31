# VDOM

## VNode

`VNode`는 Virtual DOM 노드를 나타내는 공통 이름이다.

- `VNode = ElementVNode | TextVNode`

## ElementVNode

Element 노드는 태그를 표현한다.

- `type`: `'element'`
- `tag`: 태그 이름 문자열
- `key`: 형제 노드 비교에 사용하는 식별자
- `props`: 속성 객체
- `children`: 자식 노드 배열

```ts
type ElementVNode = {
  type: 'element';
  tag: string;
  key: string | null;
  props: Record<string, string>;
  children: VNode[];
};
```

## TextVNode

Text 노드는 문자열을 표현한다.

- `type`: `'text'`
- `value`: 문자열 값

```ts
type TextVNode = {
  type: 'text';
  value: string;
};
```

## Diff (1차)

1차 diff는 두 `VNode`를 `path` 기반 patch 목록으로 비교한다.

- 기본 비교는 자식 인덱스 기준으로 동작한다.
- key가 안정적으로 주어진 형제 element 자식은 제한적으로 key 비교를 시도한다.
- fully keyed, unique key 형제에서 이전/다음 key 집합이 같으면 reorder를 `move` patch로 표현한다.
- key 집합이 달라진 reorder나 mixed/non-keyed 형제는 여전히 인덱스 비교로 되돌린다.

## DOM 생성

- `createDOMNodeFromVNode`는 `VNode`를 실제 DOM `Node`로 만든다.
- element는 `tag`, `props`, `children`을 그대로 반영한다.
- `key`는 내부 식별자이지만 round-trip 유지를 위해 DOM `key` attribute에도 기록한다.
- DOM을 다시 읽을 때는 `key`를 표준으로 해석하고, 기존 `data-key`는 호환용 fallback으로만 읽는다.

## Patch 적용

- `applyPatch`와 `applyPatches`는 `VNodePatch`를 실제 DOM subtree에 순서대로 적용한다.
- patch의 `path`는 현재 관리 중인 subtree의 `childNodes[index]` 기준으로 해석한다.
- `move` patch는 같은 부모 아래에서만 허용되며 `{ type: 'move', from, to }` 형태를 사용한다.
- 잘못된 path나 대상 타입 불일치는 무시하지 않고 에러로 처리한다.
