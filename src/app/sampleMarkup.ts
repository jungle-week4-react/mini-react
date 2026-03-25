/**
 * 요구사항:
 * - 5단계 구조화
 * - 실제 영역 초기 샘플 HTML을 준비한다.
 *
 * 관련 API:
 * - SAMPLE_MARKUP
 */

/**
 * key 기반 diff를 바로 확인할 수 있도록 리스트 재정렬과 속성 변경이 쉬운 구조로 준비한다.
 */
export const SAMPLE_MARKUP = `
  <section key="demo-root" class="card">
    <header key="hero" class="hero">
      <h2 key="title">Virtual DOM Playground</h2>
      <p key="desc">Edit the test area, then patch only the changed DOM nodes.</p>
    </header>
    <ul key="todo-list" class="todo-list">
      <li key="task-a" class="todo-item">Read real DOM</li>
      <li key="task-b" class="todo-item active">Build virtual DOM</li>
      <li key="task-c" class="todo-item">Apply patch</li>
    </ul>
  </section>
`.trim();
