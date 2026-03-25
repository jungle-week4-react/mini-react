# mini-react

Virtual DOM, Diff, Patch 흐름을 브라우저에서 직접 확인할 수 있는 TypeScript 기반 mini-react 실습 프로젝트입니다.

## Getting started

```bash
npm install
npm run build
```

빌드 후 [index.html](C:\crafton\1\SW-AI-W02-05-79-JeongYeongHoon\week4\react_virtual_dom_diff\index.html)을 브라우저에서 열면 됩니다.

## Scripts

```bash
npm run typecheck
npm run build
```

## Run demo

```bash
npm install
npm run build
npx serve . -l 4173
```

브라우저에서 [http://localhost:4173/index.html](http://localhost:4173/index.html)로 접속하면 데모 페이지를 확인할 수 있습니다.

## Project structure

```text
src/
  diff/       Diff 계산 로직
  patch/      Patch 적용 및 DOM 반영 로직
  history/    undo/redo state history
  vdom/       DOM <-> Virtual DOM 변환 로직
  app/        샘플 화면 및 초기화 로직
dist/         TypeScript build output
docs/         요구사항 정의서와 API 명세서
index.html    검증용 데모 페이지
styles.css    데모 페이지 스타일
```

## Current scope

- TypeScript strict mode
- ESM output for browser-oriented development
- No JSX
- key 기반 child diff
- patch 기반 실제 DOM 반영
- undo/redo history

## Library usage

### High-level API

버튼과 영역 DOM을 넘기면 patch, history, undo/redo를 한 번에 연결할 수 있습니다.

```ts
import { initializeApp } from "./dist/index.js";

initializeApp({
  actualRoot: document.querySelector("#actual-root") as HTMLElement,
  testRoot: document.querySelector("#test-root") as HTMLElement,
  patchButton: document.querySelector("#patch-btn") as HTMLButtonElement,
  undoButton: document.querySelector("#undo-btn") as HTMLButtonElement,
  redoButton: document.querySelector("#redo-btn") as HTMLButtonElement,
  patchLog: document.querySelector("#patch-log") as HTMLElement,
});
```

필요한 HTML 예시는 아래와 같습니다.

```html
<div id="actual-root"></div>
<div id="test-root" contenteditable="true"></div>
<button id="patch-btn">Patch</button>
<button id="undo-btn">뒤로가기</button>
<button id="redo-btn">앞으로가기</button>
<p id="patch-log"></p>
<script type="module" src="./dist/index.js"></script>
```

### Low-level engine API

Virtual DOM 엔진만 직접 사용하고 싶다면 핵심 함수만 import해서 조립할 수 있습니다.

```ts
import { domToVdom, diffTrees, applyPatches } from "./dist/index.js";

const actualRoot = document.querySelector("#actual-root") as HTMLElement;
const testRoot = document.querySelector("#test-root") as HTMLElement;

const oldTree = domToVdom(actualRoot);
const newTree = domToVdom(testRoot);

if (oldTree && newTree) {
  const patches = diffTrees(oldTree, newTree);
  applyPatches(actualRoot, patches);
}
```

### Available exports

- `initializeApp`
- `getRequiredElements`
- `domToVdom`
- `vdomToDom`
- `cloneVdom`
- `diffTrees`
- `applyPatch`
- `applyPatches`
- `renderActualTree`
- `renderTestTree`
- `createHistory`
- `pushHistory`
- `undo`
- `redo`
