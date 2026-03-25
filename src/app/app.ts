import type { HistoryState, VNode } from "../types.js";
import { diffTrees } from "../diff/diffTrees.js";
import {
  canRedo,
  canUndo,
  createHistory,
  getCurrentHistoryTree,
  pushHistory,
  redo,
  undo,
} from "../history/historyManager.js";
import { applyPatches } from "../patch/applyPatches.js";
import { renderActualTree, renderTestTree } from "../patch/renderTree.js";
import { domToVdom } from "../vdom/domToVdom.js";
import { SAMPLE_MARKUP } from "./sampleMarkup.js";

/**
 * 요구사항:
 * - 5단계 구조화
 * - History와 UI 이벤트를 연결한다.
 * - 엔트리 파일에서 초기화 흐름을 정리한다.
 *
 * 관련 API:
 * - initializeApp(): void
 * - handlePatchClick(): void
 * - handleUndoClick(): void
 * - handleRedoClick(): void
 */

export interface AppElements {
  actualRoot: HTMLElement;
  testRoot: HTMLElement;
  patchButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  patchLog: HTMLElement;
}

export interface AppState {
  currentTree: VNode;
  history: HistoryState;
}

/**
 * 외부에서 전달받은 DOM 요소를 기준으로 앱을 초기화하고 버튼 이벤트를 연결한다.
 */
export function initializeApp(elements: AppElements): AppState {
  seedActualRoot(elements.actualRoot);

  const initialTree = domToVdom(elements.actualRoot);

  if (initialTree === null) {
    throw new Error("초기 실제 영역 DOM을 Virtual DOM으로 변환할 수 없습니다.");
  }

  const state: AppState = {
    currentTree: initialTree,
    history: createHistory(initialTree),
  };

  renderTestTree(elements.testRoot, initialTree);
  updateControls(elements, state.history);
  updatePatchLog(elements.patchLog, []);

  elements.patchButton.addEventListener("click", () => {
    handlePatchClick(state, elements);
  });

  elements.undoButton.addEventListener("click", () => {
    handleUndoClick(state, elements);
  });

  elements.redoButton.addEventListener("click", () => {
    handleRedoClick(state, elements);
  });

  return state;
}

/**
 * 테스트 영역을 다시 읽어 patch를 계산하고 실제 영역에 반영한다.
 */
export function handlePatchClick(state: AppState, elements: AppElements): void {
  const nextTree = domToVdom(elements.testRoot);

  if (nextTree === null) {
    return;
  }

  const patches = diffTrees(state.currentTree, nextTree);

  applyPatches(elements.actualRoot, patches);

  state.currentTree = nextTree;
  state.history = pushHistory(state.history, nextTree);

  updateControls(elements, state.history);
  updatePatchLog(elements.patchLog, patches);
}

/**
 * 이전 snapshot으로 돌아가 실제 영역과 테스트 영역을 함께 복원한다.
 */
export function handleUndoClick(state: AppState, elements: AppElements): void {
  state.history = undo(state.history);

  const tree = getCurrentHistoryTree(state.history);

  state.currentTree = tree;
  renderActualTree(elements.actualRoot, tree);
  renderTestTree(elements.testRoot, tree);
  updateControls(elements, state.history);
}

/**
 * 다음 snapshot으로 이동해 실제 영역과 테스트 영역을 함께 복원한다.
 */
export function handleRedoClick(state: AppState, elements: AppElements): void {
  state.history = redo(state.history);

  const tree = getCurrentHistoryTree(state.history);

  state.currentTree = tree;
  renderActualTree(elements.actualRoot, tree);
  renderTestTree(elements.testRoot, tree);
  updateControls(elements, state.history);
}

/**
 * 데모 페이지처럼 id 기반으로 DOM 요소를 가져오고 싶을 때 사용하는 보조 함수다.
 */
export function getRequiredElements(): AppElements {
  const actualRoot = document.getElementById("actual-root");
  const testRoot = document.getElementById("test-root");
  const patchButton = document.getElementById("patch-btn");
  const undoButton = document.getElementById("undo-btn");
  const redoButton = document.getElementById("redo-btn");
  const patchLog = document.getElementById("patch-log");

  if (
    !(actualRoot instanceof HTMLElement) ||
    !(testRoot instanceof HTMLElement) ||
    !(patchButton instanceof HTMLButtonElement) ||
    !(undoButton instanceof HTMLButtonElement) ||
    !(redoButton instanceof HTMLButtonElement) ||
    !(patchLog instanceof HTMLElement)
  ) {
    throw new Error("앱 초기화에 필요한 DOM 요소를 찾을 수 없습니다.");
  }

  return {
    actualRoot,
    testRoot,
    patchButton,
    undoButton,
    redoButton,
    patchLog,
  };
}

function seedActualRoot(actualRoot: HTMLElement): void {
  actualRoot.innerHTML = SAMPLE_MARKUP;
}

function updateControls(elements: AppElements, history: HistoryState): void {
  elements.undoButton.disabled = !canUndo(history);
  elements.redoButton.disabled = !canRedo(history);
}

function updatePatchLog(patchLog: HTMLElement, patchTypes: Array<{ type: string }>): void {
  if (patchTypes.length === 0) {
    patchLog.textContent = "No patches yet.";
    return;
  }

  patchLog.textContent = patchTypes.map((patch) => patch.type).join(", ");
}
