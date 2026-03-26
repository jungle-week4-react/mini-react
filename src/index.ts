<<<<<<< HEAD
import {
  createElementNode,
  isElementNode,
  type ElementNodeKey,
  type ElementNodeProps,
  type ElementVNode,
} from './vdom/element-node.js';
import { createVNodeFromElement } from './vdom/from-dom.js';
import type { VNode } from './vdom/node.js';
import { createTextNode, isTextNode, type TextVNode } from './vdom/text-node.js';
import {
  FiberFlags,
  FiberRenderState,
  ROOT_FIBER_TYPE,
  TEXT_FIBER_TYPE,
  YIELD_INTERVAL_MS,
  createFiber,
  createFiberRoot,
  createWorkInProgress,
  fiberRuntime,
  setFiberStatus,
  subscribeFiberStatus,
  type Fiber,
  type FiberRoot,
  type FiberStatusListener,
} from './vdom/fiber.js';
import { commitRoot } from './vdom/dom.js';
import { performUnitOfWork, reconcileChildren } from './vdom/reconciler.js';
import {
  render,
  resetRenderRoot,
  scheduleUpdateOnRoot,
  shouldYield,
  workLoop,
} from './vdom/scheduler.js';

export type { ElementNodeKey, ElementNodeProps, ElementVNode } from './vdom/element-node.js';
export type { VNode } from './vdom/node.js';
export type { TextVNode } from './vdom/text-node.js';
export type { Fiber, FiberRoot, FiberStatusListener } from './vdom/fiber.js';
export { createElementNode, isElementNode } from './vdom/element-node.js';
export { createVNodeFromElement } from './vdom/from-dom.js';
export { createTextNode, isTextNode } from './vdom/text-node.js';
export {
  FiberFlags,
  FiberRenderState,
  ROOT_FIBER_TYPE,
  TEXT_FIBER_TYPE,
  YIELD_INTERVAL_MS,
  createFiber,
  createFiberRoot,
  createWorkInProgress,
  fiberRuntime,
  setFiberStatus,
  subscribeFiberStatus,
} from './vdom/fiber.js';
export { commitRoot } from './vdom/dom.js';
export { performUnitOfWork, reconcileChildren } from './vdom/reconciler.js';
export {
  render,
  resetRenderRoot,
  scheduleUpdateOnRoot,
  shouldYield,
  workLoop,
} from './vdom/scheduler.js';

const DEMO_ROOT_ID = 'fiber-demo';
const SOURCE_EDITOR_ID = 'source-editor';
const HTML_MODE_BUTTON_ID = 'html-mode-button';
const VDOM_MODE_BUTTON_ID = 'vdom-mode-button';
const TARGET_ID = 'render-root';
const HISTORY_ID = 'history-tabs';
const STATUS_ID = 'status-output';
const LOG_ID = 'log-output';
const PATCH_BUTTON_ID = 'patch-button';
const RESET_BUTTON_ID = 'reset-button';
const EDITOR_INDENT = '  ';
const INITIAL_SOURCE_MARKUP = `
<section class="stack" data-key="stack">
  <article class="card" data-key="alpha">
    <h3>Alpha</h3>
    <p>첫 번째 카드입니다.</p>
  </article>
  <article class="card" data-key="beta">
    <h3>Beta</h3>
    <p>두 번째 카드입니다.</p>
  </article>
  <article class="card accent" data-key="gamma">
    <h3>Gamma</h3>
    <p>세 번째 카드입니다.</p>
  </article>
</section>
`.trim();

type SourceMode = 'html' | 'vdom';

type SourceState = {
  html: string;
  vnode: VNode;
  vdomText: string;
};

type DemoSnapshot = {
  id: string;
  html: string;
  label: string;
};

type EditorHistoryEntry = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
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
  // 데모 페이지가 준비된 뒤 마이크로태스크에서 초기화를 시작한다.
  queueMicrotask(setupPatchDemo);
}

function setupPatchDemo(): void {
  const demoRoot = document.getElementById(DEMO_ROOT_ID);
  const sourceEditor = document.getElementById(SOURCE_EDITOR_ID);
  const htmlModeButton = document.getElementById(HTML_MODE_BUTTON_ID);
  const vdomModeButton = document.getElementById(VDOM_MODE_BUTTON_ID);
  const renderRoot = document.getElementById(TARGET_ID);
  const historyRoot = document.getElementById(HISTORY_ID);
  const statusRoot = document.getElementById(STATUS_ID);
  const logRoot = document.getElementById(LOG_ID);
  const patchButton = document.getElementById(PATCH_BUTTON_ID);
  const resetButton = document.getElementById(RESET_BUTTON_ID);

  if (
    demoRoot === null
    || sourceEditor === null
    || htmlModeButton === null
    || vdomModeButton === null
    || renderRoot === null
    || historyRoot === null
    || statusRoot === null
    || logRoot === null
    || patchButton === null
    || resetButton === null
    || (sourceEditor instanceof HTMLTextAreaElement) === false
    || (htmlModeButton instanceof HTMLButtonElement) === false
    || (vdomModeButton instanceof HTMLButtonElement) === false
    || (patchButton instanceof HTMLButtonElement) === false
    || (resetButton instanceof HTMLButtonElement) === false
  ) {
    return;
  }

  const editorElement = sourceEditor;
  const htmlModeButtonElement = htmlModeButton;
  const vdomModeButtonElement = vdomModeButton;
  const renderElement = renderRoot;
  const historyElement = historyRoot;
  const statusElement = statusRoot;
  const logElement = logRoot;
  const patchButtonElement = patchButton;
  const resetButtonElement = resetButton;

  const addLog = createLogWriter(logElement);
  let sourceMode: SourceMode = 'html';
  let sourceState = createSourceStateFromHtml(INITIAL_SOURCE_MARKUP);
  let currentStatuses: FiberRenderState[] = [];
  let isPatchRunning = false;
  let resolveIdle: (() => void) | null = null;
  let currentCommittedHtml = '';
  let currentSnapshotId: string | null = null;
  let selectedSnapshotId: string | null = null;
  let history: DemoSnapshot[] = [];
  let versionCount = 0;
  let editorHistory: EditorHistoryEntry[] = [];
  let editorHistoryIndex = -1;
  let isApplyingEditorHistory = false;

  // 현재 데모 렌더 루트의 Fiber 상태를 구독해 진행 상황을 UI에 표시한다.
  const unsubscribe = subscribeFiberStatus((root, status) => {
    if (root.container !== renderElement) {
      return;
    }

    if (currentStatuses[currentStatuses.length - 1] !== status) {
      currentStatuses.push(status);
      statusElement.textContent = currentStatuses.join(' -> ');
      addLog('status', status);
    }

    if (status === FiberRenderState.Idle && resolveIdle !== null) {
      const done = resolveIdle;

      resolveIdle = null;
      done();
    }
  });

  htmlModeButtonElement.addEventListener('click', () => {
    switchSourceMode('html');
  });

  vdomModeButtonElement.addEventListener('click', () => {
    switchSourceMode('vdom');
  });

  patchButtonElement.addEventListener('click', () => {
    void applyPatch('editor');
  });

  resetButtonElement.addEventListener('click', () => {
    resetDemo();
  });

  editorElement.addEventListener('input', () => {
    selectedSnapshotId = null;
    renderHistoryTabs(
      historyElement,
      history,
      selectedSnapshotId,
      currentSnapshotId,
      selectHistorySnapshot,
    );
    pushEditorHistorySnapshot();
  });
  editorElement.addEventListener('keydown', (event) => {
    handleEditorKeydown(event, editorElement, undoEditor, redoEditor);
  });
  editorElement.addEventListener('copy', (event) => {
    handleEditorCopy(event, editorElement);
  });
  editorElement.addEventListener('cut', (event) => {
    handleEditorCut(event, editorElement);
  });
  editorElement.addEventListener('paste', (event) => {
    handleEditorPaste(event, editorElement);
  });

  void initializeDemo();

  window.addEventListener(
    'beforeunload',
    () => {
      unsubscribe();
    },
    { once: true },
  );

  async function initializeDemo(): Promise<void> {
    resetState();
    addLog('init', '초기 예제를 바로 patch해 첫 화면을 준비했습니다.');
    await applyPatch('init');
  }

  function resetDemo(): void {
    resetState();
    addLog('reset', 'source를 초기 예제로 되돌렸습니다. Patch를 눌러 다시 반영하세요.');
  }

  function resetState(): void {
    history = [];
    versionCount = 0;
    currentCommittedHtml = '';
    currentSnapshotId = null;
    selectedSnapshotId = null;
    currentStatuses = [];
    resolveIdle = null;
    sourceMode = 'html';
    sourceState = createSourceStateFromHtml(INITIAL_SOURCE_MARKUP);
    // viewer DOM만 비우지 않고 renderer가 들고 있던 FiberRoot도 함께 초기화한다.
    resetRenderRoot(renderElement);
    renderElement.innerHTML = '';
    statusElement.textContent = 'idle';
    logElement.innerHTML = '';
    renderSourceEditor();
    renderHistoryTabs(
      historyElement,
      history,
      selectedSnapshotId,
      currentSnapshotId,
      selectHistorySnapshot,
    );
  }

  function switchSourceMode(nextMode: SourceMode): void {
    if (sourceMode === nextMode) {
      return;
    }

    try {
      sourceState = readSourceStateFromEditor(sourceMode, editorElement.value);
      sourceMode = nextMode;
      renderSourceEditor();
    } catch (error) {
      reportSourceError(error);
    }
  }

  function selectHistorySnapshot(snapshotId: string): void {
    const snapshot = history.find((item) => item.id === snapshotId);

    if (snapshot === undefined) {
      return;
    }

    sourceState = createSourceStateFromHtml(snapshot.html);
    selectedSnapshotId = snapshot.id;
    renderSourceEditor();
    renderHistoryTabs(
      historyElement,
      history,
      selectedSnapshotId,
      currentSnapshotId,
      selectHistorySnapshot,
    );
    addLog('history', `${snapshot.label}을 source로 불러왔습니다.`);
  }

  async function applyPatch(from: string): Promise<void> {
    if (isPatchRunning) {
      addLog('skip', '이전 patch가 아직 진행 중입니다.');
      return;
    }

    isPatchRunning = true;
    patchButtonElement.disabled = true;
    resetButtonElement.disabled = true;
    currentStatuses = [];
    statusElement.textContent = 'waiting for scheduler';

    try {
      sourceState = readSourceStateFromEditor(sourceMode, editorElement.value);
      renderSourceEditor();
      addLog('patch', `${from}에서 patch를 시작했습니다.`);
      addLog(
        'source',
        sourceMode === 'html'
          ? 'HTML source를 읽어 VDOM으로 변환했습니다.'
          : 'VDOM source를 읽어 HTML과 VDOM을 동기화했습니다.',
      );

      await waitForNextPaint();

      // commit 단계가 끝나 idle로 돌아올 때까지 기다린다.
      const idlePromise = new Promise<void>((resolve) => {
        resolveIdle = resolve;
      });

      render(sourceState.vnode, renderElement);
      addLog('render', 'render(vnode, container)를 호출했습니다.');

      await idlePromise;

      if (sourceState.html !== currentCommittedHtml) {
        const snapshot = findSnapshotByHtml(history, sourceState.html)
          ?? createSnapshot(sourceState.html);

        currentCommittedHtml = sourceState.html;
        currentSnapshotId = snapshot.id;
        selectedSnapshotId = snapshot.id;
        renderHistoryTabs(
          historyElement,
          history,
          selectedSnapshotId,
          currentSnapshotId,
          selectHistorySnapshot,
        );
        addLog('history', `${snapshot.label}을 현재 버전으로 저장했습니다.`);
      } else if (selectedSnapshotId !== null) {
        currentSnapshotId = selectedSnapshotId;
        renderHistoryTabs(
          historyElement,
          history,
          selectedSnapshotId,
          currentSnapshotId,
          selectHistorySnapshot,
        );
      }

      addLog('commit', 'patch가 끝나 viewer가 갱신됐습니다.');
    } catch (error) {
      reportSourceError(error);
    } finally {
      resolveIdle = null;
      isPatchRunning = false;
      patchButtonElement.disabled = false;
      resetButtonElement.disabled = false;
    }
  }

  function createSnapshot(html: string): DemoSnapshot {
    versionCount += 1;

    const snapshot = {
      id: `v${versionCount}`,
      html,
      label: `v${versionCount}`,
    };

    history.push(snapshot);

    return snapshot;
  }

  function renderSourceEditor(): void {
    editorElement.value = sourceMode === 'html'
      ? sourceState.html
      : sourceState.vdomText;
    htmlModeButtonElement.dataset.active = String(sourceMode === 'html');
    vdomModeButtonElement.dataset.active = String(sourceMode === 'vdom');
    resetEditorHistory();
  }

  function reportSourceError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    statusElement.textContent = `error: ${message}`;
    addLog('error', message);
  }

  function createEditorHistoryEntry(): EditorHistoryEntry {
    return {
      value: editorElement.value,
      selectionStart: editorElement.selectionStart,
      selectionEnd: editorElement.selectionEnd,
    };
  }

  function resetEditorHistory(): void {
    editorHistory = [createEditorHistoryEntry()];
    editorHistoryIndex = 0;
  }

  function pushEditorHistorySnapshot(): void {
    if (isApplyingEditorHistory) {
      return;
    }

    const nextEntry = createEditorHistoryEntry();
    const currentEntry = editorHistory[editorHistoryIndex];

    if (
      currentEntry !== undefined
      && currentEntry.value === nextEntry.value
      && currentEntry.selectionStart === nextEntry.selectionStart
      && currentEntry.selectionEnd === nextEntry.selectionEnd
    ) {
      return;
    }

    editorHistory = editorHistory.slice(0, editorHistoryIndex + 1);
    editorHistory.push(nextEntry);

    if (editorHistory.length > 200) {
      editorHistory.shift();
    }

    editorHistoryIndex = editorHistory.length - 1;
  }

  function applyEditorHistoryEntry(entry: EditorHistoryEntry): void {
    isApplyingEditorHistory = true;
    editorElement.value = entry.value;
    editorElement.setSelectionRange(entry.selectionStart, entry.selectionEnd);
    selectedSnapshotId = null;
    renderHistoryTabs(
      historyElement,
      history,
      selectedSnapshotId,
      currentSnapshotId,
      selectHistorySnapshot,
    );
    isApplyingEditorHistory = false;
  }

  function undoEditor(): void {
    if (editorHistoryIndex <= 0) {
      return;
    }

    editorHistoryIndex -= 1;
    applyEditorHistoryEntry(editorHistory[editorHistoryIndex]);
  }

  function redoEditor(): void {
    if (editorHistoryIndex >= editorHistory.length - 1) {
      return;
    }

    editorHistoryIndex += 1;
    applyEditorHistoryEntry(editorHistory[editorHistoryIndex]);
  }
}

function readSourceStateFromEditor(
  mode: SourceMode,
  sourceText: string,
): SourceState {
  if (mode === 'html') {
    return createSourceStateFromHtml(sourceText);
  }

  return createSourceStateFromVdomText(sourceText);
}

function createSourceStateFromHtml(sourceHtml: string): SourceState {
  // HTML 입력을 정규화한 뒤 DOM -> VDOM 변환을 수행한다.
  const normalizedHtml = normalizeSourceMarkup(sourceHtml);
  const rootElement = parseSingleRootHtml(normalizedHtml);
  const vnode = createVNodeFromElement(rootElement);

  return createSourceStateFromVNode(vnode);
}

function createSourceStateFromVdomText(vdomText: string): SourceState {
  // JSON 형태의 편집용 VDOM 텍스트를 실제 VNode 구조로 복원한다.
  const parsed = JSON.parse(vdomText) as unknown;
  const vnode = parseEditableVNode(parsed, 'root');

  return createSourceStateFromVNode(vnode);
}

function createSourceStateFromVNode(vnode: VNode): SourceState {
  // 하나의 VNode에서 HTML 문자열과 JSON 편집 문자열을 동시에 만든다.
  return {
    html: serializeVNodeToHtml(vnode),
    vnode,
    vdomText: JSON.stringify(toEditableVNode(vnode), null, 2),
  };
}

function parseSingleRootHtml(sourceHtml: string): Element {
  // 데모 편집기는 루트 엘리먼트 하나만 다루도록 제한한다.
  const template = document.createElement('template');

  template.innerHTML = sourceHtml;

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

function toEditableVNode(vnode: VNode): EditableVNode {
  // VNode를 textarea에서 편집하기 쉬운 JSON 구조로 변환한다.
  if (isTextNode(vnode)) {
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
  // 사용자가 편집한 JSON을 검증하면서 VNode로 다시 만든다.
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
      throw new Error(`${path}.tag는 비어있지 않은 string이어야 합니다.`);
    }

    const key = normalizeEditableKey(candidate.key, path);
    const props = normalizeEditableProps(candidate.props, path);
    const children = normalizeEditableChildren(candidate.children, path);

    return createElementNode(candidate.tag, props, children, key);
  }

  throw new Error(`${path}.type은 "element" 또는 "text"여야 합니다.`);
}

function normalizeEditableKey(
  key: unknown,
  path: string,
): ElementNodeKey {
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
  // props는 문자열 값만 허용해 DOM attribute 모델과 맞춘다.
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
): Array<ElementVNode | TextVNode> {
  // children 배열을 재귀적으로 파싱해 element/text 자식을 복원한다.
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
  // VNode를 사람이 읽기 쉬운 형태의 HTML 문자열로 직렬화한다.
  const indent = '  '.repeat(depth);

  if (isTextNode(vnode)) {
    return `${indent}${escapeHtml(vnode.value)}`;
  }

  const attributes = [
    ...(vnode.key !== null ? [['data-key', vnode.key] as const] : []),
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

  if (vnode.children.length === 1 && isTextNode(vnode.children[0])) {
    return `${indent}${openTag}${escapeHtml(vnode.children[0].value)}</${vnode.tag}>`;
  }

  return [
    `${indent}${openTag}`,
    ...vnode.children.map((child) => serializeVNodeToHtml(child, depth + 1)),
    `${indent}</${vnode.tag}>`,
  ].join('\n');
}

function escapeHtml(value: string): string {
  // 텍스트 내용이 HTML로 해석되지 않도록 이스케이프한다.
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  // attribute 값 안의 큰따옴표도 함께 이스케이프한다.
  return escapeHtml(value).replaceAll('"', '&quot;');
}

function normalizeSourceMarkup(sourceHtml: string): string {
  // 빈 입력을 막고 앞뒤 공백만 정리한다.
  const normalizedHtml = sourceHtml.trim();

  if (normalizedHtml === '') {
    throw new Error('source가 비어 있습니다.');
  }

  return normalizedHtml;
}

function handleEditorKeydown(
  event: KeyboardEvent,
  editor: HTMLTextAreaElement,
  onUndo: () => void,
  onRedo: () => void,
): void {
  // textarea에서 undo/redo와 탭 들여쓰기를 직접 제어한다.
  const key = event.key.toLowerCase();

  if ((event.ctrlKey || event.metaKey) && key === 'z') {
    event.preventDefault();

    if (event.shiftKey) {
      onRedo();
      return;
    }

    onUndo();
    return;
  }

  if (event.ctrlKey && key === 'y') {
    event.preventDefault();
    onRedo();
    return;
  }

  if (shouldKeepNativeEditorShortcut(event)) {
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  event.preventDefault();

  const { selectionStart, selectionEnd, value } = editor;
  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const rawBlockEnd = value.indexOf('\n', selectionEnd);
  const blockEnd = rawBlockEnd === -1 ? value.length : rawBlockEnd;

  if (selectionStart === selectionEnd && event.shiftKey === false) {
    const nextValue =
      `${value.slice(0, selectionStart)}${EDITOR_INDENT}${value.slice(selectionEnd)}`;

    applyEditorEdit(
      editor,
      nextValue,
      selectionStart + EDITOR_INDENT.length,
      selectionStart + EDITOR_INDENT.length,
    );
    return;
  }

  const selectedBlock = value.slice(lineStart, blockEnd);
  const lines = selectedBlock.split('\n');

  if (event.shiftKey) {
    const outdentedLines = lines.map((line) => removeIndentPrefix(line));
    const nextBlock = outdentedLines.map(({ line }) => line).join('\n');
    const removedBeforeCaret = outdentedLines[0]?.removed ?? 0;
    const removedTotal = outdentedLines.reduce((sum, entry) => sum + entry.removed, 0);
    const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(blockEnd)}`;
    const nextSelectionStart =
      selectionStart === selectionEnd
        ? Math.max(lineStart, selectionStart - removedBeforeCaret)
        : lineStart;
    const nextSelectionEnd =
      selectionStart === selectionEnd
        ? nextSelectionStart
        : Math.max(nextSelectionStart, blockEnd - removedTotal);

    applyEditorEdit(editor, nextValue, nextSelectionStart, nextSelectionEnd);
    return;
  }

  const nextBlock = lines.map((line) => `${EDITOR_INDENT}${line}`).join('\n');
  const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(blockEnd)}`;
  const addedWidth = EDITOR_INDENT.length * lines.length;
  const nextSelectionStart =
    selectionStart === selectionEnd ? selectionStart + EDITOR_INDENT.length : lineStart;
  const nextSelectionEnd =
    selectionStart === selectionEnd
      ? nextSelectionStart
      : selectionEnd + addedWidth;

  applyEditorEdit(editor, nextValue, nextSelectionStart, nextSelectionEnd);
}

function shouldKeepNativeEditorShortcut(event: KeyboardEvent): boolean {
  // 전체 선택, 복사, 붙여넣기 같은 기본 단축키는 브라우저 동작을 유지한다.
  if ((event.ctrlKey || event.metaKey) === false) {
    return false;
  }

  const key = event.key.toLowerCase();

  return key === 'a' || key === 'c' || key === 'v' || key === 'x';
}

function handleEditorCopy(
  event: ClipboardEvent,
  editor: HTMLTextAreaElement,
): void {
  // 선택 영역만 복사하도록 클립보드 동작을 명시적으로 맞춘다.
  const selectedText = editor.value.slice(editor.selectionStart, editor.selectionEnd);

  if (selectedText === '' || event.clipboardData === null) {
    return;
  }

  event.preventDefault();
  event.clipboardData.setData('text/plain', selectedText);
}

function handleEditorCut(
  event: ClipboardEvent,
  editor: HTMLTextAreaElement,
): void {
  // 잘라내기는 클립보드 기록과 값 삭제를 동시에 처리한다.
  const { selectionStart, selectionEnd, value } = editor;
  const selectedText = value.slice(selectionStart, selectionEnd);

  if (selectedText === '' || event.clipboardData === null) {
    return;
  }

  event.preventDefault();
  event.clipboardData.setData('text/plain', selectedText);
  applyEditorEdit(
    editor,
    `${value.slice(0, selectionStart)}${value.slice(selectionEnd)}`,
    selectionStart,
    selectionStart,
  );
}

function handleEditorPaste(
  event: ClipboardEvent,
  editor: HTMLTextAreaElement,
): void {
  // 붙여넣기 후 caret 위치까지 직접 보정한다.
  const pastedText = event.clipboardData?.getData('text/plain');

  if (pastedText === undefined || pastedText === '') {
    return;
  }

  event.preventDefault();

  const { selectionStart, selectionEnd, value } = editor;
  const nextValue =
    `${value.slice(0, selectionStart)}${pastedText}${value.slice(selectionEnd)}`;
  const caret = selectionStart + pastedText.length;

  applyEditorEdit(editor, nextValue, caret, caret);
}

function removeIndentPrefix(line: string): { line: string; removed: number } {
  // shift+tab 시 한 단계 들여쓰기를 제거한다.
  if (line.startsWith(EDITOR_INDENT)) {
    return {
      line: line.slice(EDITOR_INDENT.length),
      removed: EDITOR_INDENT.length,
    };
  }

  if (line.startsWith('\t')) {
    return {
      line: line.slice(1),
      removed: 1,
    };
  }

  return {
    line,
    removed: 0,
  };
}

function applyEditorEdit(
  editor: HTMLTextAreaElement,
  nextValue: string,
  selectionStart: number,
  selectionEnd: number,
): void {
  // 값 변경 후 input 이벤트를 다시 발생시켜 히스토리와 UI를 동기화한다.
  editor.value = nextValue;
  editor.setSelectionRange(selectionStart, selectionEnd);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function createLogWriter(logRoot: Element): (kind: string, message: string) => void {
  // 데모 타임라인 로그에 시각, 종류, 메시지를 함께 기록한다.
  return (kind, message) => {
    const item = document.createElement('div');
    const timeLabel = document.createElement('span');
    const kindLabel = document.createElement('span');
    const messageLabel = document.createElement('span');
    const time = new Date().toLocaleTimeString('ko-KR', {
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
    });

    item.className = 'timeline-entry';
    timeLabel.className = 'timeline-time';
    kindLabel.className = 'timeline-kind';
    messageLabel.className = 'timeline-message';
    kindLabel.textContent = kind;
    timeLabel.textContent = time;
    messageLabel.textContent = message;
    item.append(timeLabel, kindLabel, messageLabel);
    logRoot.append(item);
    logRoot.scrollTop = logRoot.scrollHeight;
  };
}

function renderHistoryTabs(
  historyRoot: Element,
  history: DemoSnapshot[],
  selectedSnapshotId: string | null,
  currentSnapshotId: string | null,
  onSelect: (snapshotId: string) => void,
): void {
  // patch 히스토리를 버튼 탭 형태로 렌더링한다.
  historyRoot.innerHTML = '';

  for (const snapshot of history) {
    const tab = document.createElement('button');

    tab.type = 'button';
    tab.className = 'history-tab';
    tab.textContent = snapshot.label;
    tab.dataset.selected = String(snapshot.id === selectedSnapshotId);
    tab.dataset.current = String(snapshot.id === currentSnapshotId);
    tab.addEventListener('click', () => {
      onSelect(snapshot.id);
    });
    historyRoot.append(tab);
  }
}

function findSnapshotByHtml(
  history: DemoSnapshot[],
  html: string,
): DemoSnapshot | null {
  // 같은 HTML이 이미 기록된 버전인지 확인해 중복 스냅샷을 막는다.
  return history.find((snapshot) => snapshot.html === html) ?? null;
}

function waitForNextPaint(): Promise<void> {
  // 브라우저가 한 번 페인트한 뒤 다음 단계로 진행하도록 기다린다.
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}
=======
export type { ElementNodeProps, ElementVNode } from './vdom/element-node.js';
export type { VNode } from './vdom/node.js';
export type { TextVNode } from './vdom/text-node.js';
export { createElementNode, isElementNode } from './vdom/element-node.js';
export { createVNodeFromElement } from './vdom/from-dom.js';
export { createTextNode, isTextNode } from './vdom/text-node.js';
>>>>>>> ce57f184a19528aedf1ad3aed78341ecd8fea76c
