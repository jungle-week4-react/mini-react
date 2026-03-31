import { diffVNode, type VNodePatch } from './vdom/diff.js';
import { createElementNode, isElementNode, type ElementNodeProps } from './vdom/element-node.js';
import { createVNodeFromElement } from './vdom/from-dom.js';
import { mountVNode, applyPatches } from './vdom/dom.js';
import type { VNode } from './vdom/node.js';
import { createTextNode } from './vdom/text-node.js';

// 브라우저에서 필요한 DOM 요소 id를 상수로 모아 두면
// 마크업 구조가 바뀌어도 문자열 오타를 한곳에서 관리할 수 있다.
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

// 빠른 삽입 버튼이 허용하는 태그 집합.
// HTML / VDOM 어느 모드에서 눌러도 동일한 구조를 만들기 위해 제한된 목록만 사용한다.
const QUICK_INSERT_TAGS = ['h1', 'h2', 'h3', 'article'] as const;

type QuickInsertTag = (typeof QUICK_INSERT_TAGS)[number];

type SourceMode = 'html' | 'vdom';

// 데모에서 한 시점의 상태를 표현하는 구조.
// 같은 내용을 HTML 문자열 / VDOM 객체 / VDOM 편집용 JSON 텍스트로 함께 들고 다닌다.
type DemoState = {
  html: string;
  vnode: VNode;
  vdomText: string;
};

// history에는 사람이 보기 쉬운 라벨과 실제 상태를 함께 저장한다.
type HistoryEntry = {
  label: string;
  state: DemoState;
};

// VDOM 탭에서 직접 편집할 수 있도록 VNode를 JSON 친화적인 구조로 풀어 쓴 타입.
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

// 데모 전체의 상태와 이벤트를 연결하는 진입점.
// 화면 준비, 초기 상태 생성, 버튼/에디터 이벤트 바인딩을 한곳에서 수행한다.
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

  // null 체크와 instanceof 체크가 끝난 뒤에는
  // 아래 로직에서 안전하게 재사용할 수 있도록 별도 변수로 고정한다.
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

  // 초기 실제 DOM을 읽어 첫 번째 상태(v1)를 만든다.
  const initialState = createStateFromElement(readSingleRootElement(actualRootElement));
  let sourceMode: SourceMode = 'html';
  let committedState = initialState;
  let draftState = initialState;
  let history: HistoryEntry[] = [{ label: 'v1', state: initialState }];
  let historyIndex = 0;
  let nextVersion = 2;
  let lastPatches: VNodePatch[] = [];
  let draftError: string | null = null;

  // 첫 로딩 시에는 실제 영역을 한 번 정규화해서 이후 patch path가 흔들리지 않게 만든다.
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

  // 빠른 태그 버튼은 현재 draft state의 루트 자식 뒤에 새 노드를 추가한다.
  // 즉시 source 텍스트를 다시 그려 주기 때문에 HTML / VDOM 모드 모두 같은 결과를 본다.
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

      // 빠른 태그는 루트 아래 자식 추가를 전제로 하므로 root가 element여야 한다.
      if (isElementNode(draftState.vnode) === false) {
        statusTextElement.textContent = '빠른 태그 추가는 element root에서만 사용할 수 있습니다.';
        return;
      }

      // 새 자식을 VDOM 기준으로 추가한 뒤 다시 HTML/VDOM 텍스트를 동기화한다.
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

  // 사용자가 source를 수정할 때마다 우선 "초안 상태"만 갱신한다.
  // 실제 DOM 반영은 Patch 버튼을 눌렀을 때만 일어난다.
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

    // 실제로 화면에 반영된 committedState와 현재 초안 draftState를 비교한다.
    const patches = diffVNode(committedState.vnode, draftState.vnode);

    lastPatches = patches;
    renderDiffOutput(diffOutputElement, lastPatches);

    if (patches.length > 0) {
      // patch가 하나라도 있으면 실제 DOM에 적용한 뒤,
      // 적용 결과를 다시 읽어 committedState를 최신 DOM 기준으로 정규화한다.
      applyPatches(actualRootElement, patches);
      committedState = createStateFromElement(readSingleRootElement(actualRootElement));
      draftState = committedState;

      // 새 상태가 확정되었으므로 forward history를 잘라내고 새 버전을 쌓는다.
      history = history.slice(0, historyIndex + 1);
      history.push({
        label: `v${nextVersion}`,
        state: committedState,
      });
      historyIndex = history.length - 1;
      nextVersion += 1;
      renderHistoryTabs(historyTabsElement, history, historyIndex, moveToHistoryIndex);
    } else {
      // 변경이 없더라도 직렬화 포맷은 한번 정리해 둔다.
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

  // reset은 이 브랜치에서 만든 history / diff / source 상태를 모두 초기 샘플로 되돌린다.
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

  // HTML/VDOM 탭 전환은 현재 draftState를 서로 다른 텍스트 표현으로 보여주는 역할만 한다.
  // source에 파싱 오류가 있으면 다른 표현으로 안전하게 변환할 수 없으므로 막아 둔다.
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

  // history 이동도 결국 "이전 committedState -> 선택한 state"에 대한 diff를 만들고
  // 그 patch를 실제 DOM에 적용하는 흐름으로 동작한다.
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

// 현재 모드에 맞는 source 텍스트를 textarea에 그린다.
function renderSourceEditor(
  sourceEditor: HTMLTextAreaElement,
  sourceMode: SourceMode,
  draftState: DemoState,
): void {
  sourceEditor.value = sourceMode === 'html'
    ? draftState.html
    : draftState.vdomText;
}

// 선택된 모드를 버튼의 data-active로 표시한다.
function renderModeButtons(
  htmlModeButton: HTMLButtonElement,
  vdomModeButton: HTMLButtonElement,
  sourceMode: SourceMode,
): void {
  htmlModeButton.dataset.active = String(sourceMode === 'html');
  vdomModeButton.dataset.active = String(sourceMode === 'vdom');
}

// 저장된 history를 pill 버튼 목록으로 다시 그린다.
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

// 상단 상태 줄과 Viewer 메타 정보를 한 번에 갱신한다.
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

// 현재 history 위치와 파싱 오류 유무에 따라 버튼 활성 상태를 관리한다.
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

// diff 결과는 학습/검증용이므로 JSON 그대로 노출한다.
function renderDiffOutput(diffOutput: Element, patches: VNodePatch[]): void {
  diffOutput.textContent = JSON.stringify(patches, null, 2);
}

// 버튼의 data-tag 문자열을 QuickInsertTag 유니온으로 좁혀서 안전하게 사용한다.
function readQuickInsertTag(value: string | undefined): QuickInsertTag | null {
  if (value === undefined) {
    return null;
  }

  return QUICK_INSERT_TAGS.find((tag) => tag === value) ?? null;
}

// 빠른 삽입 버튼이 눌렸을 때 실제로 추가할 VNode 템플릿을 만든다.
// article은 diff 실험에 바로 쓸 수 있도록 key와 viewer-card class를 기본 포함한다.
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

// article quick insert에서 사용할 다음 key 값을 생성한다.
// 현재 트리에 이미 존재하는 article-1, article-2 ... 형식을 피해서 충돌을 막는다.
function createNextArticleKey(rootVNode: Extract<VNode, { type: 'element' }>): string {
  const usedKeys = new Set<string>();

  collectVNodeKeys(rootVNode, usedKeys);

  let index = 1;

  while (usedKeys.has(`article-${index}`)) {
    index += 1;
  }

  return `article-${index}`;
}

// 트리를 순회하면서 현재 사용 중인 key를 모두 모은다.
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

// 현재 source 모드에 맞게 문자열을 읽어 DemoState로 변환한다.
// 파싱 실패는 throw 대신 Error 객체로 돌려줘 이벤트 핸들러가 쉽게 처리하게 한다.
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

// HTML source 문자열을 template에 넣어 파싱한 뒤 DemoState로 바꾼다.
function createStateFromHtml(sourceHtml: string): DemoState {
  return createStateFromElement(parseSingleRootHtml(sourceHtml));
}

// VDOM 탭의 JSON 문자열을 EditableVNode 구조로 읽은 뒤 실제 VNode로 복원한다.
function createStateFromVdomText(vdomText: string): DemoState {
  const parsed = JSON.parse(vdomText) as unknown;
  const vnode = parseEditableVNode(parsed, 'root');

  return createStateFromVNode(vnode);
}

// 실제 DOM Element를 읽어서 DemoState로 바꾼다.
function createStateFromElement(element: Element): DemoState {
  return createStateFromVNode(createVNodeFromElement(element));
}

// 하나의 VNode를 HTML 문자열, VDOM 객체, 편집용 JSON 텍스트 세 형태로 정리한다.
function createStateFromVNode(vnode: VNode): DemoState {
  return {
    html: serializeVNodeToHtml(vnode),
    vnode,
    vdomText: JSON.stringify(toEditableVNode(vnode), null, 2),
  };
}

// 사용자가 입력한 HTML source는 공백/주석을 제외하고
// 반드시 루트 element 하나만 가지도록 강제한다.
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

// 실제 DOM 출력 영역도 루트 element 하나만 가진다는 전제 위에서 동작한다.
function readSingleRootElement(root: Element): Element {
  const element = root.firstElementChild;

  if (element === null || root.children.length !== 1) {
    throw new Error('영역 내부에는 하나의 root element만 있어야 합니다.');
  }

  return element;
}

// VNode를 JSON 편집기에서 다루기 쉬운 단순 객체 구조로 바꾼다.
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

// JSON에서 읽은 값을 실제 VNode 구조로 검증하며 복원한다.
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

// key는 string 또는 null만 허용한다.
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

// props는 string 값만 가지는 평평한 object만 허용한다.
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

// children 배열을 재귀적으로 검사하며 VNode 배열로 변환한다.
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

// VNode를 다시 HTML 문자열로 직렬화한다.
// 데모에서는 source 편집기의 기본 포맷을 일정하게 유지하기 위해 이 함수를 사용한다.
function serializeVNodeToHtml(vnode: VNode, depth = 0): string {
  const indent = '  '.repeat(depth);

  if (vnode.type === 'text') {
    return `${indent}${escapeHtml(vnode.value)}`;
  }

  const attributes = [
    ...(vnode.key === null ? [] : [['key', vnode.key] as const]),
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

// text node 직렬화 시 HTML 예약 문자를 이스케이프한다.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// attribute 값은 text 이스케이프에 더해 큰따옴표도 추가로 처리한다.
function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;');
}
