import { diffVNode, type VNodePatch } from './vdom/diff.js';
import { createElementNode, isElementNode, type ElementNodeProps } from './vdom/element-node.js';
import { createVNodeFromElement } from './vdom/from-dom.js';
import { mountVNode, applyPatches } from './vdom/dom.js';
import type { VNode } from './vdom/node.js';
import { createTextNode } from './vdom/text-node.js';

const ACTUAL_ROOT_ID = 'actual-root';
const SOURCE_EDITOR_ID = 'source-editor';
const HTML_MODE_BUTTON_ID = 'html-mode-button';
const VDOM_MODE_BUTTON_ID = 'vdom-mode-button';
const HISTORY_TABS_ID = 'history-tabs';
const PATCH_BUTTON_ID = 'patch-button';
const RESET_BUTTON_ID = 'reset-button';
const BACK_BUTTON_ID = 'history-back-button';
const FORWARD_BUTTON_ID = 'history-forward-button';
const STATUS_TEXT_ID = 'status-text';
const ERROR_TEXT_ID = 'error-text';
const HISTORY_TEXT_ID = 'history-text';
const PATCH_COUNT_ID = 'patch-count';
const DIFF_OUTPUT_ID = 'diff-output';
const QUICK_TAG_BUTTON_SELECTOR = '.quick-tag-button';

const QUICK_INSERT_TAGS = ['h1', 'h2', 'h3', 'article'] as const;

type QuickInsertTag = (typeof QUICK_INSERT_TAGS)[number];

type SourceMode = 'html' | 'vdom';

type DemoState = {
  html: string;
  vnode: VNode;
  vdomText: string;
};

type HistoryEntry = {
  label: string;
  state: DemoState;
};

type EditableVNode =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'element';
      tag: string;
      key: string | null;
      props: Record<string, string>;
      children: EditableVNode[];
    };

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setupDemo();
  }, { once: true });
}

function setupDemo(): void {
  const actualRoot = document.getElementById(ACTUAL_ROOT_ID);
  const sourceEditor = document.getElementById(SOURCE_EDITOR_ID);
  const htmlModeButton = document.getElementById(HTML_MODE_BUTTON_ID);
  const vdomModeButton = document.getElementById(VDOM_MODE_BUTTON_ID);
  const historyTabs = document.getElementById(HISTORY_TABS_ID);
  const patchButton = document.getElementById(PATCH_BUTTON_ID);
  const resetButton = document.getElementById(RESET_BUTTON_ID);
  const backButton = document.getElementById(BACK_BUTTON_ID);
  const forwardButton = document.getElementById(FORWARD_BUTTON_ID);
  const statusText = document.getElementById(STATUS_TEXT_ID);
  const errorText = document.getElementById(ERROR_TEXT_ID);
  const historyText = document.getElementById(HISTORY_TEXT_ID);
  const patchCount = document.getElementById(PATCH_COUNT_ID);
  const diffOutput = document.getElementById(DIFF_OUTPUT_ID);

  if (
    actualRoot === null
    || sourceEditor === null
    || htmlModeButton === null
    || vdomModeButton === null
    || historyTabs === null
    || patchButton === null
    || resetButton === null
    || backButton === null
    || forwardButton === null
    || statusText === null
    || errorText === null
    || historyText === null
    || patchCount === null
    || diffOutput === null
    || (sourceEditor instanceof HTMLTextAreaElement) === false
    || (htmlModeButton instanceof HTMLButtonElement) === false
    || (vdomModeButton instanceof HTMLButtonElement) === false
    || (patchButton instanceof HTMLButtonElement) === false
    || (resetButton instanceof HTMLButtonElement) === false
    || (backButton instanceof HTMLButtonElement) === false
    || (forwardButton instanceof HTMLButtonElement) === false
  ) {
    return;
  }

  const actualRootElement = actualRoot;
  const sourceEditorElement = sourceEditor;
  const htmlModeButtonElement = htmlModeButton;
  const vdomModeButtonElement = vdomModeButton;
  const historyTabsElement = historyTabs;
  const patchButtonElement = patchButton;
  const resetButtonElement = resetButton;
  const backButtonElement = backButton;
  const forwardButtonElement = forwardButton;
  const statusTextElement = statusText;
  const errorTextElement = errorText;
  const historyTextElement = historyText;
  const patchCountElement = patchCount;
  const diffOutputElement = diffOutput;
  const quickTagButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(QUICK_TAG_BUTTON_SELECTOR),
  );

  const initialState = createStateFromElement(readSingleRootElement(actualRootElement));
  let sourceMode: SourceMode = 'html';
  let committedState = initialState;
  let draftState = initialState;
  let history: HistoryEntry[] = [{ label: 'v1', state: initialState }];
  let historyIndex = 0;
  let nextVersion = 2;
  let lastPatches: VNodePatch[] = [];
  let draftError: string | null = null;

  mountVNode(actualRootElement, initialState.vnode);
  renderSourceEditor(sourceEditorElement, sourceMode, draftState);
  renderHistoryTabs(historyTabsElement, history, historyIndex, moveToHistoryIndex);
  renderModeButtons(htmlModeButtonElement, vdomModeButtonElement, sourceMode);
  renderDiffOutput(diffOutputElement, lastPatches);
  renderStatus(
    statusTextElement,
    historyTextElement,
    patchCountElement,
    history,
    historyIndex,
    lastPatches.length,
    '실제 영역의 DOM을 읽어 Virtual DOM으로 변환하고 source를 준비했습니다.',
  );
  errorTextElement.textContent = '';
  syncButtons(
    backButtonElement,
    forwardButtonElement,
    patchButtonElement,
    historyIndex,
    history.length,
    draftError !== null,
  );

  for (const quickTagButton of quickTagButtons) {
    quickTagButton.addEventListener('click', () => {
      const tag = readQuickInsertTag(quickTagButton.dataset.tag);

      if (tag === null) {
        return;
      }

      if (draftError !== null) {
        statusTextElement.textContent = '현재 source 오류를 먼저 수정한 뒤 빠른 태그를 추가하세요.';
        return;
      }

      if (isElementNode(draftState.vnode) === false) {
        statusTextElement.textContent = '빠른 태그 추가는 element root에서만 사용할 수 있습니다.';
        return;
      }

      draftState = createStateFromVNode({
        ...draftState.vnode,
        children: draftState.vnode.children.concat(
          createQuickInsertVNode(tag, draftState.vnode),
        ),
      });

      renderSourceEditor(sourceEditorElement, sourceMode, draftState);
      errorTextElement.textContent = '';
      statusTextElement.textContent =
        `${tag} 태그를 source 루트의 마지막 자식으로 추가했습니다.`;
    });
  }

  sourceEditorElement.addEventListener('input', () => {
    const result = readStateFromSource(sourceMode, sourceEditorElement.value);

    if (result instanceof Error) {
      draftError = result.message;
      errorTextElement.textContent = draftError;
      statusTextElement.textContent = 'Source를 해석할 수 없어 Patch를 잠시 막았습니다.';
    } else {
      draftState = result;
      draftError = null;
      errorTextElement.textContent = '';
      statusTextElement.textContent = 'Source 초안을 갱신했습니다. Patch를 누르면 실제 영역에 반영됩니다.';
    }

    syncButtons(
      backButtonElement,
      forwardButtonElement,
      patchButtonElement,
      historyIndex,
      history.length,
      draftError !== null,
    );
  });

  htmlModeButtonElement.addEventListener('click', () => {
    switchSourceMode('html');
  });

  vdomModeButtonElement.addEventListener('click', () => {
    switchSourceMode('vdom');
  });

  patchButtonElement.addEventListener('click', () => {
    if (draftError !== null) {
      return;
    }

    const patches = diffVNode(committedState.vnode, draftState.vnode);

    lastPatches = patches;
    renderDiffOutput(diffOutputElement, lastPatches);

    if (patches.length > 0) {
      applyPatches(actualRootElement, patches);
      committedState = createStateFromElement(readSingleRootElement(actualRootElement));
      draftState = committedState;
      history = history.slice(0, historyIndex + 1);
      history.push({
        label: `v${nextVersion}`,
        state: committedState,
      });
      historyIndex = history.length - 1;
      nextVersion += 1;
      renderHistoryTabs(historyTabsElement, history, historyIndex, moveToHistoryIndex);
    } else {
      draftState = createStateFromVNode(draftState.vnode);
    }

    renderSourceEditor(sourceEditorElement, sourceMode, draftState);
    renderModeButtons(htmlModeButtonElement, vdomModeButtonElement, sourceMode);
    renderStatus(
      statusTextElement,
      historyTextElement,
      patchCountElement,
      history,
      historyIndex,
      patches.length,
      patches.length === 0
        ? '변경점이 없어 실제 영역 DOM은 그대로 유지했습니다.'
        : 'Diff 결과를 이용해 실제 영역 DOM에 필요한 변경만 반영했습니다.',
    );
    errorTextElement.textContent = '';
    draftError = null;
    syncButtons(
      backButtonElement,
      forwardButtonElement,
      patchButtonElement,
      historyIndex,
      history.length,
      false,
    );
  });

  resetButtonElement.addEventListener('click', () => {
    sourceMode = 'html';
    mountVNode(actualRootElement, initialState.vnode);
    committedState = createStateFromElement(readSingleRootElement(actualRootElement));
    draftState = committedState;
    history = [{ label: 'v1', state: committedState }];
    historyIndex = 0;
    nextVersion = 2;
    lastPatches = [];
    draftError = null;

    renderSourceEditor(sourceEditorElement, sourceMode, draftState);
    renderHistoryTabs(historyTabsElement, history, historyIndex, moveToHistoryIndex);
    renderModeButtons(htmlModeButtonElement, vdomModeButtonElement, sourceMode);
    renderDiffOutput(diffOutputElement, lastPatches);
    renderStatus(
      statusTextElement,
      historyTextElement,
      patchCountElement,
      history,
      historyIndex,
      lastPatches.length,
      '초기 샘플 상태로 되돌렸습니다.',
    );
    errorTextElement.textContent = '';
    syncButtons(
      backButtonElement,
      forwardButtonElement,
      patchButtonElement,
      historyIndex,
      history.length,
      false,
    );
  });

  backButtonElement.addEventListener('click', () => {
    if (historyIndex === 0) {
      return;
    }

    moveToHistoryIndex(historyIndex - 1);
  });

  forwardButtonElement.addEventListener('click', () => {
    if (historyIndex >= history.length - 1) {
      return;
    }

    moveToHistoryIndex(historyIndex + 1);
  });

  function switchSourceMode(nextMode: SourceMode): void {
    if (sourceMode === nextMode) {
      return;
    }

    if (draftError !== null) {
      statusTextElement.textContent = '현재 source 오류를 먼저 수정한 뒤 모드를 전환하세요.';
      return;
    }

    sourceMode = nextMode;
    renderSourceEditor(sourceEditorElement, sourceMode, draftState);
    renderModeButtons(htmlModeButtonElement, vdomModeButtonElement, sourceMode);
  }

  function moveToHistoryIndex(nextIndex: number): void {
    if (nextIndex < 0 || nextIndex >= history.length || nextIndex === historyIndex) {
      return;
    }

    const nextState = history[nextIndex].state;

    lastPatches = diffVNode(committedState.vnode, nextState.vnode);
    renderDiffOutput(diffOutputElement, lastPatches);
    applyPatches(actualRootElement, lastPatches);
    committedState = createStateFromElement(readSingleRootElement(actualRootElement));
    draftState = committedState;
    historyIndex = nextIndex;
    draftError = null;

    renderSourceEditor(sourceEditorElement, sourceMode, draftState);
    renderHistoryTabs(historyTabsElement, history, historyIndex, moveToHistoryIndex);
    renderModeButtons(htmlModeButtonElement, vdomModeButtonElement, sourceMode);
    renderStatus(
      statusTextElement,
      historyTextElement,
      patchCountElement,
      history,
      historyIndex,
      lastPatches.length,
      `${history[historyIndex].label} 상태로 이동했습니다.`,
    );
    errorTextElement.textContent = '';
    syncButtons(
      backButtonElement,
      forwardButtonElement,
      patchButtonElement,
      historyIndex,
      history.length,
      false,
    );
  }
}

function renderSourceEditor(
  sourceEditor: HTMLTextAreaElement,
  sourceMode: SourceMode,
  draftState: DemoState,
): void {
  sourceEditor.value = sourceMode === 'html'
    ? draftState.html
    : draftState.vdomText;
}

function renderModeButtons(
  htmlModeButton: HTMLButtonElement,
  vdomModeButton: HTMLButtonElement,
  sourceMode: SourceMode,
): void {
  htmlModeButton.dataset.active = String(sourceMode === 'html');
  vdomModeButton.dataset.active = String(sourceMode === 'vdom');
}

function renderHistoryTabs(
  historyRoot: Element,
  history: HistoryEntry[],
  historyIndex: number,
  onSelect: (index: number) => void,
): void {
  historyRoot.innerHTML = '';

  for (const [index, entry] of history.entries()) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'history-pill';
    button.dataset.active = String(index === historyIndex);
    button.textContent = entry.label;
    button.addEventListener('click', () => {
      onSelect(index);
    });
    historyRoot.append(button);
  }
}

function renderStatus(
  statusText: Element,
  historyText: Element,
  patchCount: Element,
  history: HistoryEntry[],
  historyIndex: number,
  patchLength: number,
  message: string,
): void {
  const currentLabel = history[historyIndex]?.label ?? '-';

  statusText.textContent = message;
  historyText.textContent = `${currentLabel} / ${history.length}`;
  patchCount.textContent = `${patchLength} patches`;
}

function syncButtons(
  backButton: HTMLButtonElement,
  forwardButton: HTMLButtonElement,
  patchButton: HTMLButtonElement,
  historyIndex: number,
  historyLength: number,
  hasError: boolean,
): void {
  backButton.disabled = historyIndex === 0;
  forwardButton.disabled = historyIndex >= historyLength - 1;
  patchButton.disabled = hasError;
}

function renderDiffOutput(diffOutput: Element, patches: VNodePatch[]): void {
  diffOutput.textContent = JSON.stringify(patches, null, 2);
}

function readQuickInsertTag(value: string | undefined): QuickInsertTag | null {
  if (value === undefined) {
    return null;
  }

  return QUICK_INSERT_TAGS.find((tag) => tag === value) ?? null;
}

function createQuickInsertVNode(
  tag: QuickInsertTag,
  rootVNode: Extract<VNode, { type: 'element' }>,
): VNode {
  if (tag === 'article') {
    const nextKey = createNextArticleKey(rootVNode);

    return createElementNode('article', {
      key: nextKey,
      props: {
        class: 'viewer-card',
      },
      children: [
        createElementNode('h3', {
          children: [createTextNode(`Article ${nextKey}`)],
        }),
        createElementNode('p', {
          children: [createTextNode('내용을 입력하세요.')],
        }),
      ],
    });
  }

  return createElementNode(tag, {
    children: [createTextNode(`${tag.toUpperCase()} title`)],
  });
}

function createNextArticleKey(rootVNode: Extract<VNode, { type: 'element' }>): string {
  const usedKeys = new Set<string>();

  collectVNodeKeys(rootVNode, usedKeys);

  let index = 1;

  while (usedKeys.has(`article-${index}`)) {
    index += 1;
  }

  return `article-${index}`;
}

function collectVNodeKeys(vnode: VNode, keys: Set<string>): void {
  if (isElementNode(vnode) === false) {
    return;
  }

  if (vnode.key !== null) {
    keys.add(vnode.key);
  }

  for (const child of vnode.children) {
    collectVNodeKeys(child, keys);
  }
}

function readStateFromSource(
  sourceMode: SourceMode,
  sourceText: string,
): DemoState | Error {
  try {
    if (sourceMode === 'html') {
      return createStateFromHtml(sourceText);
    }

    return createStateFromVdomText(sourceText);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function createStateFromHtml(sourceHtml: string): DemoState {
  return createStateFromElement(parseSingleRootHtml(sourceHtml));
}

function createStateFromVdomText(vdomText: string): DemoState {
  const parsed = JSON.parse(vdomText) as unknown;
  const vnode = parseEditableVNode(parsed, 'root');

  return createStateFromVNode(vnode);
}

function createStateFromElement(element: Element): DemoState {
  return createStateFromVNode(createVNodeFromElement(element));
}

function createStateFromVNode(vnode: VNode): DemoState {
  return {
    html: serializeVNodeToHtml(vnode),
    vnode,
    vdomText: JSON.stringify(toEditableVNode(vnode), null, 2),
  };
}

function parseSingleRootHtml(sourceHtml: string): Element {
  const normalizedHtml = sourceHtml.trim();

  if (normalizedHtml === '') {
    throw new Error('HTML source는 비어 있을 수 없습니다.');
  }

  const template = document.createElement('template');

  template.innerHTML = normalizedHtml;

  const rootNodes = Array.from(template.content.childNodes).filter((node) => {
    if (node instanceof Comment) {
      return false;
    }

    if (node instanceof Text) {
      return node.nodeValue?.trim() !== '';
    }

    return true;
  });

  if (rootNodes.length !== 1 || (rootNodes[0] instanceof Element) === false) {
    throw new Error('HTML source는 공백을 제외하고 하나의 root element만 가져야 합니다.');
  }

  return rootNodes[0];
}

function readSingleRootElement(root: Element): Element {
  const element = root.firstElementChild;

  if (element === null || root.children.length !== 1) {
    throw new Error('영역 내부에는 하나의 root element만 있어야 합니다.');
  }

  return element;
}

function toEditableVNode(vnode: VNode): EditableVNode {
  if (vnode.type === 'text') {
    return {
      type: 'text',
      value: vnode.value,
    };
  }

  return {
    type: 'element',
    tag: vnode.tag,
    key: vnode.key,
    props: { ...vnode.props },
    children: vnode.children.map((child) => toEditableVNode(child)),
  };
}

function parseEditableVNode(value: unknown, path: string): VNode {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path}는 object 형태의 VDOM node여야 합니다.`);
  }

  const candidate = value as Partial<EditableVNode>;

  if (candidate.type === 'text') {
    if (typeof candidate.value !== 'string') {
      throw new Error(`${path}.value는 string이어야 합니다.`);
    }

    return createTextNode(candidate.value);
  }

  if (candidate.type === 'element') {
    if (typeof candidate.tag !== 'string' || candidate.tag.trim() === '') {
      throw new Error(`${path}.tag는 비어 있지 않은 string이어야 합니다.`);
    }

    return createElementNode(candidate.tag, {
      key: normalizeEditableKey(candidate.key, path),
      props: normalizeEditableProps(candidate.props, path),
      children: normalizeEditableChildren(candidate.children, path),
    });
  }

  throw new Error(`${path}.type은 "element" 또는 "text"여야 합니다.`);
}

function normalizeEditableKey(
  key: unknown,
  path: string,
): string | null {
  if (key === undefined || key === null) {
    return null;
  }

  if (typeof key !== 'string') {
    throw new Error(`${path}.key는 string 또는 null이어야 합니다.`);
  }

  return key;
}

function normalizeEditableProps(
  props: unknown,
  path: string,
): ElementNodeProps {
  if (props === undefined) {
    return {};
  }

  if (typeof props !== 'object' || props === null || Array.isArray(props)) {
    throw new Error(`${path}.props는 string 값만 가진 object여야 합니다.`);
  }

  const nextProps: ElementNodeProps = {};

  for (const [name, value] of Object.entries(props)) {
    if (typeof value !== 'string') {
      throw new Error(`${path}.props.${name}은 string이어야 합니다.`);
    }

    nextProps[name] = value;
  }

  return nextProps;
}

function normalizeEditableChildren(
  children: unknown,
  path: string,
): Array<ReturnType<typeof createElementNode> | ReturnType<typeof createTextNode>> {
  if (children === undefined) {
    return [];
  }

  if (Array.isArray(children) === false) {
    throw new Error(`${path}.children은 배열이어야 합니다.`);
  }

  return children.map((child, index) =>
    parseEditableVNode(child, `${path}.children[${index}]`),
  );
}

function serializeVNodeToHtml(vnode: VNode, depth = 0): string {
  const indent = '  '.repeat(depth);

  if (vnode.type === 'text') {
    return `${indent}${escapeHtml(vnode.value)}`;
  }

  const attributes = [
    ...(vnode.key === null ? [] : [['data-key', vnode.key] as const]),
    ...Object.entries(vnode.props),
  ];
  const openTag = attributes.length === 0
    ? `<${vnode.tag}>`
    : `<${vnode.tag} ${attributes
        .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
        .join(' ')}>`;

  if (vnode.children.length === 0) {
    return `${indent}${openTag}</${vnode.tag}>`;
  }

  if (vnode.children.length === 1 && vnode.children[0]?.type === 'text') {
    return `${indent}${openTag}${escapeHtml(vnode.children[0].value)}</${vnode.tag}>`;
  }

  return [
    `${indent}${openTag}`,
    ...vnode.children.map((child) => serializeVNodeToHtml(child, depth + 1)),
    `${indent}</${vnode.tag}>`,
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;');
}
