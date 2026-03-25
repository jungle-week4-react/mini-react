import type { Patch } from "../types.js";
import { applyPatch } from "./applyPatch.js";

/**
 * 요구사항:
 * - 4단계 Patch 적용 및 DOM 관리
 * - patch 목록의 적용 순서를 관리한다.
 *
 * 관련 API:
 * - applyPatches(root, patches): void
 */

/**
 * path 뒤쪽부터 삭제해야 앞쪽 인덱스가 흔들리지 않는다.
 */
function comparePathDescending(a: number[], b: number[]): number {
  const maxLength = Math.max(a.length, b.length);

  for (let index = 0; index < maxLength; index += 1) {
    const aValue = a[index] ?? -1;
    const bValue = b[index] ?? -1;

    if (aValue !== bValue) {
      return bValue - aValue;
    }
  }

  return b.length - a.length;
}

/**
 * patch 목록을 안전한 순서로 나누어 실제 DOM에 반영한다.
 */
export function applyPatches(root: HTMLElement, patches: Patch[]): void {
  const deletePatches = patches
    .filter((patch): patch is Extract<Patch, { type: "DELETE" }> => patch.type === "DELETE")
    .sort((left, right) => comparePathDescending(left.path, right.path));

  const movePatches = patches.filter(
    (patch): patch is Extract<Patch, { type: "MOVE" }> => patch.type === "MOVE",
  );
  const replacePatches = patches.filter(
    (patch): patch is Extract<Patch, { type: "REPLACE" }> => patch.type === "REPLACE",
  );
  const insertPatches = patches.filter(
    (patch): patch is Extract<Patch, { type: "INSERT" }> => patch.type === "INSERT",
  );
  const updatePatches = patches.filter(
    (patch): patch is Extract<Patch, { type: "UPDATE_TEXT" | "UPDATE_PROPS" }> =>
      patch.type === "UPDATE_TEXT" || patch.type === "UPDATE_PROPS",
  );

  for (const patch of deletePatches) {
    applyPatch(root, patch);
  }

  for (const patch of movePatches) {
    applyPatch(root, patch);
  }

  for (const patch of replacePatches) {
    applyPatch(root, patch);
  }

  for (const patch of insertPatches) {
    applyPatch(root, patch);
  }

  for (const patch of updatePatches) {
    applyPatch(root, patch);
  }
}
