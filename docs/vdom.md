# VDOM

## VNode

`VNode`는 Virtual DOM 노드를 나타내는 공통 이름이다.

- `VNode = ElementVNode | TextVNode`

## ElementVNode

Element 노드는 태그를 표현한다.

- `type`: `'element'`
- `tag`: 태그 이름 문자열
- `props`: 속성 객체
- `children`: 자식 노드 배열

```ts
type ElementVNode = {
  type: 'element';
  tag: string;
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

- key 기반 최적화는 하지 않는다.
- 형제 노드 이동은 추적하지 않는다.
- 자식 노드는 인덱스 기준으로만 비교한다.
