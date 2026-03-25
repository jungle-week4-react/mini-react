/**
 * 요구사항:
 * - 1단계 트리 정의 구현
 * - Virtual DOM 노드 구조를 정의한다.
 * - Patch 구조를 정의한다.
 * - History 상태 구조를 정의한다.
 * - key 사용 규칙을 타입 차원에서 드러낸다.
 *
 * 관련 API:
 * - NodePath
 * - VNode
 * - Patch
 * - HistoryState
 */

/**
 * Virtual DOM 트리에서 특정 노드의 위치를 나타내는 경로다.
 * 예: [1, 0] = 루트의 두 번째 자식의 첫 번째 자식
 */
export type NodePath = number[];

/**
 * Element 노드와 Text 노드를 구분하기 위한 공통 노드 타입이다.
 */
export type VNode = VElementNode | VTextNode;

/**
 * 실제 HTML element를 표현하는 Virtual DOM 노드다.
 * key는 형제 노드 비교 시 식별자로 사용하며 props에는 포함하지 않는다.
 */
export interface VElementNode {
  /** Element 노드임을 구분하는 태그 값 */
  nodeType: "ELEMENT";
  /** 실제 HTML 태그 이름. 예: div, ul, li */
  tagName: string;
  /** 형제 노드 비교에 사용하는 식별자 */
  key: string | null;
  /** key를 제외한 일반 HTML attribute 집합 */
  props: Record<string, string>;
  /** 현재 element 아래에 포함된 자식 Virtual DOM 노드 목록 */
  children: VNode[];
}

/**
 * 텍스트 내용을 표현하는 Virtual DOM 노드다.
 * 텍스트 노드는 자식 노드를 가지지 않으므로 textContent만 보관한다.
 */
export interface VTextNode {
  /** Text 노드임을 구분하는 태그 값 */
  nodeType: "TEXT";
  /** 텍스트 노드는 key를 가지지 않는다 */
  key: null;
  /** 실제 텍스트 내용 */
  textContent: string;
}

/**
 * Diff 결과를 실제 DOM에 반영하기 위한 변경 명령 집합이다.
 */
export type Patch =
  | InsertPatch
  | DeletePatch
  | ReplacePatch
  | UpdateTextPatch
  | UpdatePropsPatch
  | MovePatch;

/**
 * 새 노드를 특정 위치에 추가한다.
 */
export interface InsertPatch {
  /** DOM 변경 연산 종류 */
  type: "INSERT";
  /** 새 노드를 삽입할 위치 */
  path: NodePath;
  /** 새로 추가할 Virtual DOM 노드 */
  node: VNode;
}

/**
 * 특정 위치의 노드를 삭제한다.
 */
export interface DeletePatch {
  /** DOM 변경 연산 종류 */
  type: "DELETE";
  /** 삭제할 노드의 위치 */
  path: NodePath;
}

/**
 * 특정 위치의 노드를 새 노드로 완전히 교체한다.
 */
export interface ReplacePatch {
  /** DOM 변경 연산 종류 */
  type: "REPLACE";
  /** 교체 대상 노드의 위치 */
  path: NodePath;
  /** 기존 노드를 대체할 새 Virtual DOM 노드 */
  node: VNode;
}

/**
 * 텍스트 노드의 값만 변경한다.
 */
export interface UpdateTextPatch {
  /** DOM 변경 연산 종류 */
  type: "UPDATE_TEXT";
  /** 텍스트를 갱신할 노드의 위치 */
  path: NodePath;
  /** 새 텍스트 값 */
  textContent: string;
}

/**
 * Element 노드의 속성 차이를 반영한다.
 * 값이 null이면 해당 속성은 제거 대상이다.
 */
export interface UpdatePropsPatch {
  /** DOM 변경 연산 종류 */
  type: "UPDATE_PROPS";
  /** 속성을 갱신할 element 노드의 위치 */
  path: NodePath;
  /** 변경된 속성 집합. null 값은 제거를 의미한다 */
  props: Record<string, string | null>;
}

/**
 * 같은 부모 아래 형제 노드의 순서를 이동한다.
 * key 기반 child diff에서 재정렬을 표현할 때 사용한다.
 */
export interface MovePatch {
  /** DOM 변경 연산 종류 */
  type: "MOVE";
  /** 현재 위치 */
  from: NodePath;
  /** 이동할 목표 위치 */
  to: NodePath;
}

/**
 * Patch 목록에서 사용할 연산 이름 집합이다.
 * 조건 분기 시 문자열 오타를 줄이기 위해 재사용할 수 있다.
 */
export type PatchType = Patch["type"];

/**
 * undo/redo를 위해 Virtual DOM 스냅샷과 현재 위치를 저장한다.
 */
export interface HistoryState {
  /** 시점별 Virtual DOM 스냅샷 목록 */
  snapshots: VNode[];
  /** 현재 바라보고 있는 snapshot 인덱스 */
  currentIndex: number;
}
