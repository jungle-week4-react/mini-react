import type { Patch, VNode } from "../types.js";
import { diffNode } from "./diffNode.js";

/**
 * 요구사항:
 * - 3단계 Diff 구현
 * - 이전 트리와 현재 트리의 차이를 계산해 patch 목록을 만든다.
 *
 * 관련 API:
 * - diffTrees(oldTree, newTree): Patch[]
 */

/**
 * 두 Virtual DOM 트리를 비교해 변경 명령 목록을 반환한다.
 */
export function diffTrees(oldTree: VNode, newTree: VNode): Patch[] {
  const patches: Patch[] = [];

  diffNode(oldTree, newTree, [], patches);

  return patches;
}
