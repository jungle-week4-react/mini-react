import type {
  DeletePatch,
  InsertPatch,
  MovePatch,
  Patch,
  ReplacePatch,
  UpdatePropsPatch,
  UpdateTextPatch,
  VNode,
} from "../types.js";
import { vdomToDom } from "../vdom/vdomToDom.js";
import { findNodeByPath, findReferenceNode } from "./findNodeByPath.js";

/**
 * 요구사항:
 * - 4단계 Patch 적용 및 DOM 관리
 * - Diff 결과를 실제 DOM에 반영하는 메서드를 구현한다.
 *
 * 관련 API:
 * - applyPatch(root, patch): void
 */

/**
 * patch 1개를 받아 실제 DOM 변경으로 실행한다.
 */
export function applyPatch(root: HTMLElement, patch: Patch): void {
  switch (patch.type) {
    case "INSERT":
      applyInsertPatch(root, patch);
      return;
    case "DELETE":
      applyDeletePatch(root, patch);
      return;
    case "REPLACE":
      applyReplacePatch(root, patch);
      return;
    case "UPDATE_TEXT":
      applyUpdateTextPatch(root, patch);
      return;
    case "UPDATE_PROPS":
      applyUpdatePropsPatch(root, patch);
      return;
    case "MOVE":
      applyMovePatch(root, patch);
      return;
  }
}

function applyInsertPatch(root: HTMLElement, patch: InsertPatch): void {
  // path 마지막 숫자는 삽입 위치, 그 앞까지는 부모 경로다.
  const parentPath = patch.path.slice(0, -1);
  const insertIndex = patch.path[patch.path.length - 1];
  const parentNode = findNodeByPath(root, parentPath);

  if (!(parentNode instanceof Element || parentNode instanceof DocumentFragment)) {
    return;
  }

  // VDOM 객체를 브라우저가 실제로 붙일 수 있는 DOM Node로 만든다.
  const newNode = vdomToDom(patch.node);
  const referenceNode = findReferenceNode(parentNode, insertIndex);

  // 부모의 자식 목록에 새 노드를 실제로 연결한다.
  parentNode.insertBefore(newNode, referenceNode);
}

function applyDeletePatch(root: HTMLElement, patch: DeletePatch): void {
  const targetNode = findNodeByPath(root, patch.path);

  if (targetNode === null || targetNode.parentNode === null) {
    return;
  }

  // 부모 자식 목록에서 대상 노드를 제거한다.
  targetNode.parentNode.removeChild(targetNode);
}

function applyReplacePatch(root: HTMLElement, patch: ReplacePatch): void {
  const targetNode = findNodeByPath(root, patch.path);

  if (targetNode === null || targetNode.parentNode === null) {
    return;
  }

  // 새 VDOM을 실제 DOM Node로 만든 뒤 기존 노드를 통째로 교체한다.
  const replacementNode = vdomToDom(patch.node);
  targetNode.parentNode.replaceChild(replacementNode, targetNode);
}

function applyUpdateTextPatch(root: HTMLElement, patch: UpdateTextPatch): void {
  const targetNode = findNodeByPath(root, patch.path);

  if (!(targetNode instanceof Text)) {
    return;
  }

  // 텍스트 노드 값만 바꾸면 가장 작은 단위의 갱신이 된다.
  targetNode.textContent = patch.textContent;
}

function applyUpdatePropsPatch(root: HTMLElement, patch: UpdatePropsPatch): void {
  const targetNode = findNodeByPath(root, patch.path);

  if (!(targetNode instanceof HTMLElement)) {
    return;
  }

  for (const [name, value] of Object.entries(patch.props)) {
    // null은 속성 제거를 의미하고, 나머지는 새 값으로 갱신한다.
    if (value === null) {
      targetNode.removeAttribute(name);
      continue;
    }

    targetNode.setAttribute(name, value);
  }
}

function applyMovePatch(root: HTMLElement, patch: MovePatch): void {
  const targetNode = findNodeByPath(root, patch.from);
  const parentPath = patch.to.slice(0, -1);
  const nextIndex = patch.to[patch.to.length - 1];
  const parentNode = findNodeByPath(root, parentPath);

  if (
    targetNode === null ||
    !(parentNode instanceof Element || parentNode instanceof DocumentFragment)
  ) {
    return;
  }

  const referenceNode = findReferenceNode(parentNode, nextIndex);

  // 기존 노드에 insertBefore를 다시 호출하면 복사가 아니라 이동으로 동작한다.
  parentNode.insertBefore(targetNode, referenceNode);
}

/**
 * render helper가 path []일 때 사용할 수 있는 속성/자식 동기화 함수다.
 */
export function syncElementFromVNode(element: HTMLElement, vnode: VNode): void {
  if (vnode.nodeType !== "ELEMENT") {
    element.replaceChildren(vdomToDom(vnode));
    return;
  }

  syncAttributes(element, vnode);
  element.replaceChildren(...vnode.children.map((child) => vdomToDom(child)));
}

function syncAttributes(element: HTMLElement, vnode: Extract<VNode, { nodeType: "ELEMENT" }>): void {
  // 기존 속성을 모두 점검해 새 트리에 없는 값은 제거한다.
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === "key") {
      if (vnode.key === null) {
        element.removeAttribute("key");
      }
      continue;
    }

    if (!(attribute.name in vnode.props)) {
      element.removeAttribute(attribute.name);
    }
  }

  if (vnode.key !== null) {
    element.setAttribute("key", vnode.key);
  }

  for (const [name, value] of Object.entries(vnode.props)) {
    element.setAttribute(name, value);
  }
}
