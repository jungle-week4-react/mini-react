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
