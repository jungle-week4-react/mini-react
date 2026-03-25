import { cloneVdom } from "../vdom/cloneVdom.js";
import type { HistoryState, VNode } from "../types.js";

/**
 * 요구사항:
 * - 5단계 구조화
 * - 상태 history를 관리하고 undo/redo를 지원한다.
 *
 * 관련 API:
 * - createHistory(initialTree): HistoryState
 * - pushHistory(history, tree): HistoryState
 * - undo(history): HistoryState
 * - redo(history): HistoryState
 * - canUndo(history): boolean
 * - canRedo(history): boolean
 */

/**
 * 첫 Virtual DOM 스냅샷으로 history를 초기화한다.
 */
export function createHistory(initialTree: VNode): HistoryState {
  return {
    snapshots: [cloneVdom(initialTree)],
    currentIndex: 0,
  };
}

/**
 * 새 상태를 history 끝에 추가한다.
 * undo 상태에서 새 patch가 발생하면 redo 구간은 제거한다.
 */
export function pushHistory(history: HistoryState, tree: VNode): HistoryState {
  const snapshots = history.snapshots
    .slice(0, history.currentIndex + 1)
    .concat(cloneVdom(tree));

  return {
    snapshots,
    currentIndex: snapshots.length - 1,
  };
}

/**
 * 이전 snapshot으로 이동한다.
 */
export function undo(history: HistoryState): HistoryState {
  if (!canUndo(history)) {
    return history;
  }

  return {
    ...history,
    currentIndex: history.currentIndex - 1,
  };
}

/**
 * 다음 snapshot으로 이동한다.
 */
export function redo(history: HistoryState): HistoryState {
  if (!canRedo(history)) {
    return history;
  }

  return {
    ...history,
    currentIndex: history.currentIndex + 1,
  };
}

/**
 * 뒤로가기 가능 여부를 반환한다.
 */
export function canUndo(history: HistoryState): boolean {
  return history.currentIndex > 0;
}

/**
 * 앞으로가기 가능 여부를 반환한다.
 */
export function canRedo(history: HistoryState): boolean {
  return history.currentIndex < history.snapshots.length - 1;
}

/**
 * 현재 바라보는 snapshot을 안전하게 반환한다.
 */
export function getCurrentHistoryTree(history: HistoryState): VNode {
  return cloneVdom(history.snapshots[history.currentIndex]);
}
