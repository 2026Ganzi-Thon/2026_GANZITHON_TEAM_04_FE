/** 고민은 공백 포함 200자(확장 그래핌 클러스터 기준). PRD FR-02 */
export const MAX_CONCERN_CHARS = 200;
/** 카드는 최대 8장. PRD FR-02 */
export const MAX_CARDS = 8;

const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' });

/** 확장 그래핌 클러스터 개수. 이모지·결합 문자를 한 글자로 센다. */
export function countGraphemes(text: string): number {
  let n = 0;
  for (const _ of segmenter.segment(text.normalize('NFC'))) n++;
  return n;
}

/** 앞에서부터 max 그래핌까지만 남긴다. 이모지 중간에서 자르지 않는다. */
export function sliceGraphemes(text: string, max: number): string {
  let out = '';
  let n = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (n >= max) break;
    out += segment;
    n++;
  }
  return out;
}

export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

const TERMINAL = /[.!?…。！？]+$/u;

/**
 * 규칙 기반 문장 분리(AI 실패 시 대체 분리). 사용자가 쓴 문장을 요약하지 않고 그대로 나눈다.
 * 경계: 줄바꿈 / 공백이 뒤따르는 문장부호 / 한글 사이 문장부호 / ㅋㅋ·ㅠㅠ·이모지 뒤 공백.
 * 8장 제한은 호출하는 쪽에서 적용한다(초과 여부를 알려야 하므로).
 */
export function splitThoughts(text: string): string[] {
  return text
    .normalize('NFC')
    .replace(/\r\n?|\u2028|\u2029/g, '\n')
    .split(
      /\n+|(?<=[.!?…。！？])\s+|(?<=[가-힣][.!?…。！？]+)(?=[가-힣])|(?<=[ㅋㅎㅠㅜ]{2,}|\p{Extended_Pictographic})\s+/u,
    )
    .map((s) => s.trim().replace(TERMINAL, '').trim())
    .filter((s) => /[\p{L}\p{N}\p{Extended_Pictographic}]/u.test(s));
}
