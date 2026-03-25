import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createElementNode,
  createTextNode,
  diffVNode,
} from '../dist/index.js';

test('returns an empty array for identical trees', () => {
  const prev = createElementNode('div', { id: 'root' }, [
    createElementNode('span', {}, [createTextNode('hello')]),
  ]);
  const next = createElementNode('div', { id: 'root' }, [
    createElementNode('span', {}, [createTextNode('hello')]),
  ]);

  assert.deepEqual(diffVNode(prev, next), []);
});

test('replaces the root node when the tag changes', () => {
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

test('updates a nested text node by path', () => {
  const prev = createElementNode('div', {}, [
    createElementNode('span', {}, [createTextNode('before')]),
  ]);
  const next = createElementNode('div', {}, [
    createElementNode('span', {}, [createTextNode('after')]),
  ]);

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'text',
      path: [0, 0],
      value: 'after',
    },
  ]);
});

test('emits prop set and remove changes for the same tag', () => {
  const prev = createElementNode('div', {
    class: 'before',
    id: 'root',
  });
  const next = createElementNode('div', {
    class: 'after',
    title: 'greeting',
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

test('appends a child as an insert patch at the new index', () => {
  const prev = createElementNode('div', {}, [createTextNode('first')]);
  const next = createElementNode('div', {}, [
    createTextNode('first'),
    createTextNode('second'),
  ]);

  assert.deepEqual(diffVNode(prev, next), [
    {
      type: 'insert',
      path: [1],
      node: createTextNode('second'),
    },
  ]);
});

test('removes trailing children from the end toward the start', () => {
  const prev = createElementNode('div', {}, [
    createTextNode('first'),
    createTextNode('second'),
    createTextNode('third'),
  ]);
  const next = createElementNode('div', {}, [createTextNode('first')]);

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

test('treats sibling reordering as index-based updates instead of moves', () => {
  const prev = createElementNode('ul', {}, [
    createElementNode('li', {}, [createTextNode('A')]),
    createElementNode('li', {}, [createTextNode('B')]),
  ]);
  const next = createElementNode('ul', {}, [
    createElementNode('li', {}, [createTextNode('B')]),
    createElementNode('li', {}, [createTextNode('A')]),
  ]);

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
