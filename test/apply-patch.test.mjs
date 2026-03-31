import test from 'node:test';
import assert from 'node:assert/strict';

import { JSDOM } from 'jsdom';

import {
  applyPatch,
  applyPatches,
  applyContainerPatches,
  createDOMNodeFromVNode,
  createElementNode,
  createTextNode,
  createVNodeFromElement,
  diffVNode,
  mountVNode,
} from '../dist/index.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');

Object.assign(globalThis, {
  document: dom.window.document,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Text: dom.window.Text,
});

test('createDOMNodeFromVNode는 element, props, key, children을 실제 DOM으로 만든다', () => {
  const vnode = createElementNode('section', {
    key: 'root-key',
    props: {
      id: 'root',
      title: 'greeting',
    },
    children: [
      createTextNode('hello'),
      createElementNode('span', {
        props: { class: 'label' },
        children: [createTextNode('world')],
      }),
    ],
  });

  const node = createDOMNodeFromVNode(vnode, dom.window.document);

  assert.equal(node.nodeType, dom.window.Node.ELEMENT_NODE);
  assert.equal(node.tagName.toLowerCase(), 'section');
  assert.equal(node.getAttribute('key'), 'root-key');
  assert.equal(node.getAttribute('id'), 'root');
  assert.equal(node.getAttribute('title'), 'greeting');
  assert.equal(node.childNodes.length, 2);
  assert.equal(node.firstChild.nodeValue, 'hello');
  assert.equal(node.lastChild.tagName.toLowerCase(), 'span');
  assert.equal(node.lastChild.getAttribute('class'), 'label');
  assert.equal(node.lastChild.textContent, 'world');
});

test('mountVNode는 key attribute를 유지한 채 container에 루트를 마운트한다', () => {
  const container = dom.window.document.createElement('div');
  const vnode = createElementNode('section', {
    key: 'root-key',
    children: [createTextNode('hello')],
  });

  const mountedRoot = mountVNode(container, vnode);

  assert.equal(container.childNodes.length, 1);
  assert.equal(mountedRoot, container.firstChild);
  assert.equal(mountedRoot.getAttribute('key'), 'root-key');
  assert.equal(mountedRoot.textContent, 'hello');
});

test('createVNodeFromElement는 key attribute를 우선 읽는다', () => {
  const element = dom.window.document.createElement('div');

  element.setAttribute('key', 'new-key');
  element.setAttribute('data-key', 'legacy-key');
  element.setAttribute('id', 'root');

  assert.deepEqual(createVNodeFromElement(element), createElementNode('div', {
    key: 'new-key',
    props: { id: 'root' },
  }));
});

test('createVNodeFromElement는 legacy data-key도 fallback으로 읽는다', () => {
  const element = dom.window.document.createElement('div');

  element.setAttribute('data-key', 'legacy-key');
  element.setAttribute('title', 'hello');

  assert.deepEqual(createVNodeFromElement(element), createElementNode('div', {
    key: 'legacy-key',
    props: { title: 'hello' },
  }));
});

test('props와 text patch를 실제 DOM에 반영한다', () => {
  const prev = createElementNode('div', {
    props: { class: 'before', id: 'root' },
    children: [
      createElementNode('span', {
        children: [createTextNode('before')],
      }),
    ],
  });
  const next = createElementNode('div', {
    props: { class: 'after', title: 'updated' },
    children: [
      createElementNode('span', {
        children: [createTextNode('after')],
      }),
    ],
  });

  const root = createDOMNodeFromVNode(prev, dom.window.document);
  const patchedRoot = applyPatches(root, diffVNode(prev, next));

  assert.deepEqual(createVNodeFromElement(patchedRoot), next);
});

test('insert patch를 실제 DOM에 반영한다', () => {
  const prev = createElementNode('ul', {
    children: [createTextNode('first')],
  });
  const next = createElementNode('ul', {
    children: [
      createTextNode('first'),
      createTextNode('second'),
    ],
  });

  const root = createDOMNodeFromVNode(prev, dom.window.document);
  const patchedRoot = applyPatches(root, diffVNode(prev, next));

  assert.deepEqual(createVNodeFromElement(patchedRoot), next);
});

test('remove patch를 실제 DOM에 반영한다', () => {
  const prev = createElementNode('ul', {
    children: [
      createTextNode('first'),
      createTextNode('second'),
      createTextNode('third'),
    ],
  });
  const next = createElementNode('ul', {
    children: [createTextNode('first')],
  });

  const root = createDOMNodeFromVNode(prev, dom.window.document);
  const patchedRoot = applyPatches(root, diffVNode(prev, next));

  assert.deepEqual(createVNodeFromElement(patchedRoot), next);
});

test('공유 key 순서가 유지되면 keyed insert와 text patch를 함께 반영한다', () => {
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

  const root = createDOMNodeFromVNode(prev, dom.window.document);
  const patchedRoot = applyPatches(root, diffVNode(prev, next));

  assert.deepEqual(createVNodeFromElement(patchedRoot), next);
});

test('move patch를 실제 DOM에 반영하고 기존 노드 identity를 유지한다', () => {
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
      createElementNode('li', {
        key: 'c',
        children: [createTextNode('C')],
      }),
    ],
  });

  const root = createDOMNodeFromVNode(prev, dom.window.document);
  const movedNode = root.childNodes.item(1);
  const patchedRoot = applyPatch(root, {
    type: 'move',
    from: [1],
    to: [0],
  });

  assert.equal(patchedRoot, root);
  assert.equal(patchedRoot.firstChild, movedNode);
  assert.deepEqual(createVNodeFromElement(patchedRoot), next);
});

test('keyed reorder와 text patch를 함께 적용해도 DOM identity를 유지한다', () => {
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

  const root = createDOMNodeFromVNode(prev, dom.window.document);
  const movedNode = root.childNodes.item(1);
  const patchedRoot = applyPatches(root, diffVNode(prev, next));

  assert.equal(patchedRoot.firstChild, movedNode);
  assert.deepEqual(createVNodeFromElement(patchedRoot), next);
});

test('container patch 적용기에서도 move patch를 반영한다', () => {
  const container = dom.window.document.createElement('div');
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

  const root = mountVNode(container, prev);
  const movedNode = root.childNodes.item(1);

  applyContainerPatches(container, diffVNode(prev, next));

  assert.equal(container.firstChild, root);
  assert.equal(container.firstChild.firstChild, movedNode);
  assert.deepEqual(createVNodeFromElement(container.firstChild), next);
});

test('루트 replace patch를 적용하면 새 루트를 반환한다', () => {
  const prev = createElementNode('div', {
    children: [createTextNode('before')],
  });
  const next = createElementNode('section', {
    props: { id: 'after' },
    children: [createTextNode('after')],
  });

  const root = createDOMNodeFromVNode(prev, dom.window.document);
  const patchedRoot = applyPatches(root, diffVNode(prev, next));

  assert.notEqual(patchedRoot, root);
  assert.deepEqual(createVNodeFromElement(patchedRoot), next);
});

test('루트 move path는 에러를 던진다', () => {
  const root = createDOMNodeFromVNode(
    createElementNode('div', {
      children: [createTextNode('only')],
    }),
    dom.window.document,
  );

  assert.throws(
    () =>
      applyPatch(root, {
        type: 'move',
        from: [],
        to: [0],
      }),
    /Cannot move the root node/,
  );
});

test('서로 다른 부모 사이 move path는 에러를 던진다', () => {
  const root = createDOMNodeFromVNode(
    createElementNode('div', {
      children: [
        createElementNode('section', {
          children: [createTextNode('first')],
        }),
        createElementNode('article', {
          children: [createTextNode('second')],
        }),
      ],
    }),
    dom.window.document,
  );

  assert.throws(
    () =>
      applyPatch(root, {
        type: 'move',
        from: [0, 0],
        to: [1, 0],
      }),
    /different parents/,
  );
});

test('깊이가 다른 move path는 에러를 던진다', () => {
  const root = createDOMNodeFromVNode(
    createElementNode('div', {
      children: [
        createElementNode('section', {
          children: [createTextNode('first')],
        }),
      ],
    }),
    dom.window.document,
  );

  assert.throws(
    () =>
      applyPatch(root, {
        type: 'move',
        from: [0],
        to: [0, 0],
      }),
    /different depths/,
  );
});

test('잘못된 path는 에러를 던진다', () => {
  const root = createDOMNodeFromVNode(
    createElementNode('div', {
      children: [createTextNode('only')],
    }),
    dom.window.document,
  );

  assert.throws(
    () =>
      applyPatch(root, {
        type: 'text',
        path: [2],
        value: 'never',
      }),
    /Cannot resolve node at path 2/,
  );
});

test('음수 insert path는 에러를 던진다', () => {
  const root = createDOMNodeFromVNode(
    createElementNode('div', {
      children: [createTextNode('only')],
    }),
    dom.window.document,
  );

  assert.throws(
    () =>
      applyPatch(root, {
        type: 'insert',
        path: [-1],
        node: createTextNode('never'),
      }),
    /Cannot insert at index -1 under path root/,
  );
});

test('대상 노드 타입이 맞지 않으면 에러를 던진다', () => {
  const root = createDOMNodeFromVNode(
    createElementNode('div', {
      children: [createTextNode('only')],
    }),
    dom.window.document,
  );

  assert.throws(
    () =>
      applyPatch(root, {
        type: 'text',
        path: [],
        value: 'never',
      }),
    /Expected a text node at path root/,
  );
});
