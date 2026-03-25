# Virtual DOM Diff 프로젝트 API 명세서

## 1. 개요
본 문서는 Virtual DOM 생성, Diff 계산, Patch 적용, History 관리, UI 제어를 위한 내부 API를 정의한다.

본 프로젝트의 API는 서버 API가 아니라 TypeScript 모듈 단위의 내부 라이브러리 API이다.

## 2. 타입 명세

### 2.1 NodePath
```ts
type NodePath = number[];
```

- 트리 내 특정 노드의 위치를 나타내는 경로
- 예: `[1, 0]`은 루트의 두 번째 자식의 첫 번째 자식

### 2.2 VNode
```ts
type VNode = VElementNode | VTextNode;

interface VElementNode {
  nodeType: "ELEMENT";
  tagName: string;
  key: string | null;
  props: Record<string, string>;
  children: VNode[];
}

interface VTextNode {
  nodeType: "TEXT";
  key: null;
  textContent: string;
}
```

- 실제 DOM 노드를 비교 가능한 객체 트리로 표현한 타입
- `key`는 형제 노드 비교를 위한 식별자
- `props`에는 `key`를 제외한 일반 attribute만 저장한다

### 2.3 Patch
```ts
type Patch =
  | InsertPatch
  | DeletePatch
  | ReplacePatch
  | UpdateTextPatch
  | UpdatePropsPatch
  | MovePatch;

interface InsertPatch {
  type: "INSERT";
  path: NodePath;
  node: VNode;
}

interface DeletePatch {
  type: "DELETE";
  path: NodePath;
}

interface ReplacePatch {
  type: "REPLACE";
  path: NodePath;
  node: VNode;
}

interface UpdateTextPatch {
  type: "UPDATE_TEXT";
  path: NodePath;
  textContent: string;
}

interface UpdatePropsPatch {
  type: "UPDATE_PROPS";
  path: NodePath;
  props: Record<string, string | null>;
}

interface MovePatch {
  type: "MOVE";
  from: NodePath;
  to: NodePath;
}
```

- Diff 결과를 실제 DOM에 반영하기 위한 연산 단위

### 2.4 HistoryState
```ts
interface HistoryState {
  snapshots: VNode[];
  currentIndex: number;
}
```

- 상태 스냅샷과 현재 위치를 관리하는 구조

## 3. 단계별 API 명세

### 3.1 1단계 API: 트리 정의
- 이 단계에서는 별도 함수보다 타입 정의가 핵심이다.
- 구현 대상:
  - `VNode`
  - `Patch`
  - `HistoryState`
  - `NodePath`

### 3.2 2단계 API: 트리 생성 메서드

#### `domToVdom(node: Node): VNode | null`
- 설명:
  - 실제 DOM 노드를 Virtual DOM으로 변환한다.
- 입력:
  - `node`: 변환할 DOM 노드
- 반환:
  - `VNode | null`
- 규칙:
  - `TEXT_NODE`는 `VTextNode`로 변환한다.
  - `ELEMENT_NODE`는 `VElementNode`로 변환한다.
  - `key` attribute는 `vnode.key`에 저장한다.
  - `props`에는 `key`를 제외한 나머지 속성을 저장한다.
  - 공백-only 텍스트 노드는 정책에 따라 제외할 수 있다.

#### `vdomToDom(vnode: VNode): Node`
- 설명:
  - Virtual DOM을 실제 DOM으로 복원한다.
- 입력:
  - `vnode`: 렌더링 대상 Virtual DOM 노드
- 반환:
  - `Node`
- 규칙:
  - `TEXT`는 Text 노드로 생성한다.
  - `ELEMENT`는 HTMLElement로 생성한다.
  - `key`가 있으면 실제 DOM에도 `key` attribute로 반영한다.

#### `cloneVdom(tree: VNode): VNode`
- 설명:
  - History 저장용으로 Virtual DOM 트리를 깊은 복사한다.
- 입력:
  - `tree`: 복사 대상 트리
- 반환:
  - 깊은 복사된 `VNode`

### 3.3 3단계 API: Diff 구현

#### `diffTrees(oldTree: VNode, newTree: VNode): Patch[]`
- 설명:
  - 두 Virtual DOM 트리를 비교하여 Patch 목록을 생성한다.
- 입력:
  - `oldTree`: 이전 상태 트리
  - `newTree`: 현재 상태 트리
- 반환:
  - `Patch[]`

#### `diffNode(oldNode: VNode | null, newNode: VNode | null, path: NodePath, patches: Patch[]): void`
- 설명:
  - 단일 노드를 비교하여 patch를 누적한다.
- 비교 항목:
  - 생성
  - 삭제
  - 교체
  - 텍스트 변경
  - props 변경
  - children diff

#### `diffProps(oldProps: Record<string, string>, newProps: Record<string, string>): Record<string, string | null>`
- 설명:
  - 속성 차이를 계산한다.
- 반환 규칙:
  - 추가/수정 속성은 새 값
  - 삭제 속성은 `null`

#### `diffChildren(oldChildren: VNode[], newChildren: VNode[], parentPath: NodePath, patches: Patch[]): void`
- 설명:
  - 형제 노드 목록을 비교한다.
- 규칙:
  - `key`가 있으면 key 기반 매칭을 우선 사용한다.
  - `key`가 없으면 인덱스 기반 비교를 사용한다.
  - 새로 생긴 노드는 `INSERT`
  - 사라진 노드는 `DELETE`
  - 위치 변경은 `MOVE`
  - 같은 key지만 다른 tag면 `REPLACE`

### 3.4 4단계 API: Patch 적용 및 DOM 관리

#### `applyPatches(root: HTMLElement, patches: Patch[]): void`
- 설명:
  - Patch 목록을 실제 DOM에 반영한다.
- 입력:
  - `root`: 실제 영역 루트 DOM
  - `patches`: 적용 대상 patch 목록

#### `applyPatch(root: HTMLElement, patch: Patch): void`
- 설명:
  - Patch 하나를 실제 DOM에 반영한다.

#### `findNodeByPath(root: Node, path: NodePath): Node | null`
- 설명:
  - path를 기준으로 실제 DOM 노드를 찾는다.

#### `renderActualTree(root: HTMLElement, tree: VNode): void`
- 설명:
  - 실제 영역을 전체 렌더링한다.
- 사용 시점:
  - 초기 렌더
  - undo/redo 복원
  - patch fallback

#### `renderTestTree(root: HTMLElement, tree: VNode): void`
- 설명:
  - 테스트 영역을 전체 렌더링한다.

### 3.5 5단계 API: 구조화 및 History 연결

#### `createHistory(initialTree: VNode): HistoryState`
- 설명:
  - 초기 history 상태를 생성한다.

#### `pushHistory(history: HistoryState, tree: VNode): HistoryState`
- 설명:
  - 새 snapshot을 history에 추가한다.
- 규칙:
  - 현재 index가 마지막이 아니면 redo 구간을 제거한다.

#### `undo(history: HistoryState): VNode | null`
- 설명:
  - 이전 snapshot으로 이동한다.
- 반환:
  - 성공 시 `VNode`
  - 실패 시 `null`

#### `redo(history: HistoryState): VNode | null`
- 설명:
  - 다음 snapshot으로 이동한다.
- 반환:
  - 성공 시 `VNode`
  - 실패 시 `null`

#### `canUndo(history: HistoryState): boolean`
- 설명:
  - 뒤로가기 가능 여부를 반환한다.

#### `canRedo(history: HistoryState): boolean`
- 설명:
  - 앞으로가기 가능 여부를 반환한다.

#### `initializeApp(): void`
- 설명:
  - 앱 초기화를 수행한다.
- 동작:
  - 실제 영역 샘플 DOM 준비
  - 실제 DOM -> 초기 VDOM 변환
  - 테스트 영역 렌더
  - history 초기화
  - 이벤트 바인딩

#### `handlePatchClick(): void`
- 설명:
  - Patch 버튼 클릭 이벤트 처리
- 동작:
  - 테스트 영역 DOM -> Virtual DOM 변환
  - 이전 트리와 diff 계산
  - 실제 영역 patch 적용
  - history 저장
  - 버튼 상태 갱신

#### `handleUndoClick(): void`
- 설명:
  - 뒤로가기 버튼 이벤트 처리
- 동작:
  - 이전 snapshot 복원
  - 실제 영역/테스트 영역 동시 렌더

#### `handleRedoClick(): void`
- 설명:
  - 앞으로가기 버튼 이벤트 처리
- 동작:
  - 다음 snapshot 복원
  - 실제 영역/테스트 영역 동시 렌더

## 4. 공개 사용 예시

### 저수준 엔진 API 사용
```ts
import { domToVdom, diffTrees, applyPatches } from "./dist/index.js";

const oldTree = domToVdom(actualRoot);
const newTree = domToVdom(testRoot);

if (oldTree && newTree) {
  const patches = diffTrees(oldTree, newTree);
  applyPatches(actualRoot, patches);
}
```

### 상위 앱 초기화 API 사용
```ts
import { initializeApp } from "./dist/index.js";

initializeApp();
```

## 5. 제약 및 규칙
- `key`는 HTML attribute로 직접 읽는다.
- `key`는 같은 부모 아래에서 유일해야 한다.
- `props`에는 `key`를 저장하지 않는다.
- `TEXT` 노드는 children을 갖지 않는다.
- JSX는 사용하지 않는다.
- 이벤트 리스너 diff, style object diff, controlled input behavior는 초기 범위에 포함하지 않는다.
