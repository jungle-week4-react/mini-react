import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createElementNode,
  createTextNode,
  diffVNode,
} from '../dist/index.js';

test('key를 주지 않으면 기본값으로 null을 사용한다', () => {
  const node = createElementNode('div');

  assert.deepEqual(node, {
    type: 'element',
    tag: 'div',
    key: null,
    props: {},
    children: [],
  });
});

test('빈 문자열 key는 null로 정규화한다', () => {
  const node = createElementNode('div', {
    key: '',
  });

  assert.deepEqual(node, {
    type: 'element',
    tag: 'div',
    key: null,
    props: {},
    children: [],
  });
});

test('options 객체로 props와 children을 받는다', () => {
  const node = createElementNode('div', {
    props: { id: 'root' },
    children: [createTextNode('hello')],
  });

  assert.deepEqual(node, {
    type: 'element',
    tag: 'div',
    key: null,
    props: { id: 'root' },
    children: [createTextNode('hello')],
  });
});

test('props 안에 props, children 이름도 그대로 저장한다', () => {
  const node = createElementNode('div', {
    props: {
      props: 'literal-prop',
      children: 'literal-children',
    },
  });

  assert.deepEqual(node, {
    type: 'element',
    tag: 'div',
    key: null,
    props: {
      props: 'literal-prop',
      children: 'literal-children',
    },
    children: [],
  });
});

test('동일한 트리는 빈 patch 배열을 반환한다', () => {
  const prev = createElementNode('div', {
    props: { id: 'root' },
    children: [
      createElementNode('span', {
        children: [createTextNode('hello')],
      }),
    ],
  });
  const next = createElementNode('div', {
    props: { id: 'root' },
    children: [
      createElementNode('span', {
        children: [createTextNode('hello')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), []);
});

test('태그가 바뀌면 루트 노드를 replace 한다', () => {
  const prev = createElementNode('div');
  const next = createElementNode('section');

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'replace',
      path: [],
      node: next,
    },
  ]);
});

test('같은 태그여도 key가 다르면 replace 한다', () => {
  const prev = createElementNode('li', {
    key: 'item-a',
    children: [createTextNode('A')],
  });
  const next = createElementNode('li', {
    key: 'item-b',
    children: [createTextNode('A')],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'replace',
      path: [],
      node: next,
    },
  ]);
});

test('중첩된 text node 변경은 path 기준 text patch로 표현한다', () => {
  const prev = createElementNode('div', {
    children: [
      createElementNode('span', {
        children: [createTextNode('before')],
      }),
    ],
  });
  const next = createElementNode('div', {
    children: [
      createElementNode('span', {
        children: [createTextNode('after')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'text',
      path: [0, 0],
      value: 'after',
    },
  ]);
});

test('같은 태그에서는 props의 set/remove 변경을 만든다', () => {
  const prev = createElementNode('div', {
    props: {
      class: 'before',
      id: 'root',
    },
  });
  const next = createElementNode('div', {
    props: {
      class: 'after',
      title: 'greeting',
    },
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'props',
      path: [],
      set: {
        class: 'after',
        title: 'greeting',
      },
      remove: ['id'],
    },
  ]);
});

test('새 자식이 뒤에 추가되면 insert patch를 만든다', () => {
  const prev = createElementNode('div', {
    children: [createTextNode('first')],
  });
  const next = createElementNode('div', {
    children: [
      createTextNode('first'),
      createTextNode('second'),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'insert',
      path: [1],
      node: createTextNode('second'),
    },
  ]);
});

test('사라진 자식은 뒤에서부터 remove 한다', () => {
  const prev = createElementNode('div', {
    children: [
      createTextNode('first'),
      createTextNode('second'),
      createTextNode('third'),
    ],
  });
  const next = createElementNode('div', {
    children: [createTextNode('first')],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'remove',
      path: [2],
    },
    {
      type: 'remove',
      path: [1],
    },
  ]);
});

test('공유 key 순서가 유지되면 같은 key끼리 비교한다', () => {
  const prev = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('before')],
      }),
    ],
  });
  const next = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'x',
        children: [createTextNode('X')],
      }),
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('after')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'text',
      path: [1, 0],
      value: 'after',
    },
    {
      type: 'insert',
      path: [0],
      node: createElementNode('li', {
        key: 'x',
        children: [createTextNode('X')],
      }),
    },
  ]);
});

test('같은 key 집합의 순서가 바뀌면 move patch를 만든다', () => {
  const prev = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('B')],
      }),
    ],
  });
  const next = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('B')],
      }),
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'move',
      from: [1],
      to: [0],
    },
  ]);
});

test('여러 keyed 형제를 재정렬할 때 deterministic한 move patch를 만든다', () => {
  const prev = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('B')],
      }),
      createElementNode('li', {
        key: 'c',
        children: [createTextNode('C')],
      }),
      createElementNode('li', {
        key: 'd',
        children: [createTextNode('D')],
      }),
    ],
  });
  const next = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'd',
        children: [createTextNode('D')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('B')],
      }),
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        key: 'c',
        children: [createTextNode('C')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'move',
      from: [3],
      to: [0],
    },
    {
      type: 'move',
      from: [2],
      to: [1],
    },
  ]);
});

test('move 후 같은 key의 세부 변경은 최종 인덱스 기준 path를 사용한다', () => {
  const prev = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('before')],
      }),
    ],
  });
  const next = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('after')],
      }),
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'move',
      from: [1],
      to: [0],
    },
    {
      type: 'text',
      path: [0, 0],
      value: 'after',
    },
  ]);
});

test('key 집합이 달라진 reorder는 기존 index diff로 되돌린다', () => {
  const prev = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('B')],
      }),
    ],
  });
  const next = createElementNode('ul', {
    children: [
      createElementNode('li', {
        key: 'x',
        children: [createTextNode('X')],
      }),
      createElementNode('li', {
        key: 'b',
        children: [createTextNode('B')],
      }),
      createElementNode('li', {
        key: 'a',
        children: [createTextNode('A')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'replace',
      path: [0],
      node: next.children[0],
    },
    {
      type: 'insert',
      path: [2],
      node: next.children[2],
    },
  ]);
});

test('text 형제 노드만 있으면 기존 index 기반 비교를 유지한다', () => {
  const prev = createElementNode('ul', {
    children: [
      createElementNode('li', {
        children: [createTextNode('A')],
      }),
      createElementNode('li', {
        children: [createTextNode('B')],
      }),
    ],
  });
  const next = createElementNode('ul', {
    children: [
      createElementNode('li', {
        children: [createTextNode('B')],
      }),
      createElementNode('li', {
        children: [createTextNode('A')],
      }),
    ],
  });

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'text',
      path: [0, 0],
      value: 'B',
    },
    {
      type: 'text',
      path: [1, 0],
      value: 'A',
    },
  ]);
});
