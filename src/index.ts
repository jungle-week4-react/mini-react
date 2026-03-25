import {
  getRequiredElements as getRequiredElementsInternal,
  initializeApp as initializeAppInternal,
} from "./app/app.js";

/**
 * 요구사항:
 * - 1단계 트리 정의 결과를 외부에서 import 할 수 있어야 한다.
 * - 2단계 트리 생성 메서드를 외부에서 import 할 수 있어야 한다.
 * - 3단계 diff 메서드를 외부에서 import 할 수 있어야 한다.
 * - 4단계 patch/DOM 반영 메서드를 외부에서 import 할 수 있어야 한다.
 * - 5단계 history, UI 초기화 메서드를 외부에서 import 할 수 있어야 한다.
 *
 * 관련 API:
 * - export type { NodePath, VNode, Patch, HistoryState }
 * - export { domToVdom, vdomToDom, cloneVdom }
 * - export { diffTrees, applyPatch, applyPatches, renderActualTree, renderTestTree }
 * - export { initializeApp, getRequiredElements, createHistory, pushHistory, undo, redo }
 */

export type {
  DeletePatch,
  HistoryState,
  InsertPatch,
  MovePatch,
  NodePath,
  Patch,
  PatchType,
  ReplacePatch,
  UpdatePropsPatch,
  UpdateTextPatch,
  VElementNode,
  VNode,
  VTextNode,
} from "./types.js";

export { cloneVdom } from "./vdom/cloneVdom.js";
export { domToVdom } from "./vdom/domToVdom.js";
export { vdomToDom } from "./vdom/vdomToDom.js";
export { diffChildren } from "./diff/diffChildren.js";
export { diffNode } from "./diff/diffNode.js";
export { diffProps } from "./diff/diffProps.js";
export { diffTrees } from "./diff/diffTrees.js";
export {
  canRedo,
  canUndo,
  createHistory,
  getCurrentHistoryTree,
  pushHistory,
  redo,
  undo,
} from "./history/historyManager.js";
export {
  getRequiredElements,
  handlePatchClick,
  handleRedoClick,
  handleUndoClick,
  initializeApp,
} from "./app/app.js";
export { applyPatch, syncElementFromVNode } from "./patch/applyPatch.js";
export { applyPatches } from "./patch/applyPatches.js";
export { findNodeByPath, findReferenceNode } from "./patch/findNodeByPath.js";
export { renderActualTree, renderTestTree } from "./patch/renderTree.js";

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("actual-root") && document.getElementById("test-root")) {
      initializeAppInternal(getRequiredElementsInternal());
    }
  });
}
