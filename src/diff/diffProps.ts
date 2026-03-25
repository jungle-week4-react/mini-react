/**
 * 요구사항:
 * - 3단계 Diff 구현
 * - 이전 props와 현재 props의 차이를 계산한다.
 *
 * 관련 API:
 * - diffProps(oldProps, newProps): Record<string, string | null>
 */

/**
 * 속성 차이를 계산한다.
 * 값이 null인 항목은 실제 DOM에서 제거해야 하는 속성이다.
 */
export function diffProps(
  oldProps: Record<string, string>,
  newProps: Record<string, string>,
): Record<string, string | null> {
  const changedProps: Record<string, string | null> = {};

  // 새 props를 기준으로 추가/수정된 값을 찾는다.
  for (const [name, value] of Object.entries(newProps)) {
    if (oldProps[name] !== value) {
      changedProps[name] = value;
    }
  }

  // 이전에는 있었지만 새 props에는 없는 속성은 제거 대상으로 표시한다.
  for (const name of Object.keys(oldProps)) {
    if (!(name in newProps)) {
      changedProps[name] = null;
    }
  }

  return changedProps;
}
