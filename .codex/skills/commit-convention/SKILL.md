---
name: commit-convention
description: Generate and review hybrid Conventional Commit messages for this repository. Use when Codex needs to suggest a commit message from code or docs changes, choose a commit type, rewrite a vague commit title, or check whether a message follows this project's rules: English type prefix, Korean subject and body, optional body, and English BREAKING CHANGE footer.
---

# Commit Convention

## Overview

Generate 1-3 commit message candidates from a change summary.
Keep the format Conventional Commits-compatible while writing the subject and body in Korean.

## Output Workflow

When the user provides a diff summary, follow this order:

1. Infer the most accurate commit type.
2. Write 1-3 final commit message candidates.
3. Add a one-line reason only when the type choice is not obvious.

Prefer a single strong candidate over three weak variations.
Do not run git commands, install hooks, or enforce the rule automatically.

## Commit Format

Use one of these formats:

```text
<type>: <한국어 제목>
```

Add a body only when the change needs rationale, impact, or caution:

```text
<type>: <한국어 제목>

<한국어 본문>
```

Use an English footer for breaking changes:

```text
BREAKING CHANGE: explain the incompatible change in English
```

## Allowed Types

- `feat`: 사용자 관점의 기능 추가
- `fix`: 버그 수정
- `refactor`: 동작 변화 없이 구조 개선
- `docs`: 문서 변경
- `test`: 테스트 추가 또는 수정
- `chore`: 잡무성 변경, 설정 외 유지보수 작업
- `style`: 동작에 영향 없는 포맷팅, 정리
- `perf`: 성능 개선
- `build`: 빌드 설정, 패키지 설정, 컴파일 구성 변경
- `ci`: CI 설정 변경
- `revert`: 이전 커밋 되돌리기

Choose the narrowest valid type. For TypeScript config, package metadata, output paths, or compiler options, prefer `build`.

## Scope Policy

Do not use scopes in commit titles for this repository.
Let the changed files and Korean subject communicate the affected area.

## Subject Rules

- Write the subject in Korean.
- Keep it to one line.
- Do not end with a period.
- Describe the result of the change, not the act of working.
- Avoid bare titles such as `수정`, `작업`, `변경`, `업데이트`.
- Prefer concrete outcomes such as `자식 노드 비교 순서를 바로잡아` or `타입스크립트 빌드 설정을 추가`.

## Body Rules

Add a body only when at least one of these is true:

- the reason for the change is not obvious
- the impact area is broad
- there is migration or usage caution
- reviewers need context that does not fit in the subject

Write the body in Korean. Keep it short and factual.
Explain why the change was made or what constraint it handles.

## Examples

Use patterns like these:

```text
feat: DOM 렌더러 초기 구조를 추가

fix: 자식 노드 재정렬 시 인덱스 계산 오류를 고쳐

docs: README에 타입스크립트 시작 방법을 정리

build: TypeScript 출력 경로와 타입 선언 생성을 설정

refactor: 가상 노드 생성 흐름을 단순화
```

When body text helps, format it like this:

```text
fix: 자식 노드 재정렬 시 인덱스 계산 오류를 고쳐

키 비교 후 재배치 순서를 다시 계산하도록 바꿔
중첩 목록 갱신에서 잘못된 DOM 이동이 발생하지 않게 한다
```

For breaking changes, format the footer like this:

```text
feat: 렌더러 초기화 API를 단순화

기본 사용 흐름을 하나로 맞추기 위해 진입 함수를 통합한다

BREAKING CHANGE: replace createRenderer() with createRoot()
```

## Response Style

Return commit candidates as plain text blocks that the user can copy directly.
If useful, add one short `이유:` line after the candidates.
If the summary is ambiguous, make the best assumption and state it briefly instead of asking for perfect detail.
