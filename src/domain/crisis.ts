/**
 * 위기 문구 감지 초안. 실제 판정은 서버(POST /safety/check, 저장 전 서버 검사)가 한다.
 * 이 파일은 가짜 API에서 서버 규칙을 흉내 내는 데 쓴다.
 * TODO(팀+전문가): 위기 문장 목록과 일상 문장 목록을 나눠 검수하고 오탐·미탐을 확인한다.
 */
const PHRASES = [
  '죽고싶', '죽구싶', '죽고십', '죽어버리고싶', '죽고만싶',
  '살기싫', '살고싶지않', '살이유가없', '사라지고싶', '없어지고싶',
  '극단적선택', '자살하', '자살할', '자살생각', '자살충동',
  '목숨을끊', '생을마감', '스스로목숨',
];
const WORD = /(^|[\s\p{P}])자살($|[\s\p{P}]|을|이|은|도|만|생각|충동|하|할|한)/u;

const clean = (s: string) => s.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '');
const compact = (s: string) => clean(s).replace(/[\s\p{P}\p{S}]/gu, '');

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  const c = compact(text);
  return PHRASES.some((k) => c.includes(k)) || WORD.test(clean(text));
}
