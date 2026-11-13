export type Three = 'yes' | 'some' | 'no';

/**
 * 피그마 '말랑이와 이야기 하니 어때?' 두 질문을 API Q6 moodReduced(boolean) 하나로 바꾼다.
 * 맴돎(응 -1, 조금 0, 아니 +1) + 넘어갈 수 있음(응 +1, 조금 0, 아니 -1) 합이 0 이상이면 '줄었어'.
 * '아니'(줄지 않음)면 결과 화면에 상담 링크가 뜬다. 위기로 단정하지 않는다(PRD FR-07).
 * TODO(기획): 환산 규칙 확정.
 */
export function toMoodReduced(stuck: Three, canMoveOn: Three): boolean {
  const a = { yes: -1, some: 0, no: 1 }[stuck];
  const b = { yes: 1, some: 0, no: -1 }[canMoveOn];
  return a + b >= 0;
}
