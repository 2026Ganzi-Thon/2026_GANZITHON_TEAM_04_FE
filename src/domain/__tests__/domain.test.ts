import { describe, expect, test } from 'vitest';
import type { CanAct, Weight } from '../../api/types';
import { detectCrisis } from '../crisis';
import { growthStage } from '../growth';
import { recommendPath } from '../recommend';
import { toMoodReduced } from '../reflect';
import { countGraphemes, MAX_CARDS, sliceGraphemes, splitThoughts } from '../text';

describe('recommendPath (PRD FR-05 표)', () => {
  test('30개 유효 조합', () => {
    const table: Record<CanAct, Record<'true' | 'false', [string, string]>> = {
      HAS_ACTION: { false: ['ACTION', 'SWITCH'], true: ['ACTION', 'SWITCH'] },
      NO_ACTION: { true: ['DEFER', 'DEFER'], false: ['DEFER', 'SWITCH'] },
      UNKNOWN: { true: ['DEFER', 'DEFER'], false: ['DEFER', 'SWITCH'] },
    };
    let n = 0;
    for (const canAct of Object.keys(table) as CanAct[]) {
      for (const needsTime of [true, false]) {
        for (const w of [1, 2, 3, 4, 5] as Weight[]) {
          const [light, heavy] = table[canAct][String(needsTime) as 'true' | 'false'];
          expect(recommendPath(canAct, needsTime, w)).toBe(w >= 4 ? heavy : light);
          n++;
        }
      }
    }
    expect(n).toBe(30);
  });
  test('잘못된 값은 에러', () => {
    expect(() => recommendPath(undefined as unknown as CanAct, true, 3)).toThrow();
    expect(() => recommendPath('HAS_ACTION', undefined as unknown as boolean, 3)).toThrow();
    expect(() => recommendPath('HAS_ACTION', true, 0 as Weight)).toThrow();
  });
});

describe('글자 수(그래핌)', () => {
  test('이모지·결합 문자를 한 글자로 센다', () => {
    expect(countGraphemes('가나다')).toBe(3);
    expect(countGraphemes('👍🏽')).toBe(1);
    expect(countGraphemes('👨‍👩‍👧')).toBe(1);
    expect(countGraphemes('한'.normalize('NFD'))).toBe(1);
    expect(countGraphemes('a b')).toBe(3);
  });
  test('자를 때 이모지 중간에서 자르지 않는다', () => {
    expect(sliceGraphemes('ab👨‍👩‍👧c', 3)).toBe('ab👨‍👩‍👧');
  });
});

describe('splitThoughts (대체 분리)', () => {
  test.each<[string, string[]]>([
    ['친구가 연락을 읽었는데 답이 없어. 어제 내가 한 말 때문에 화났나 봐. 이제 멀어지려나 봐.', ['친구가 연락을 읽었는데 답이 없어', '어제 내가 한 말 때문에 화났나 봐', '이제 멀어지려나 봐']],
    ['3.5점 받았어. 망했나?... 어떡하지', ['3.5점 받았어', '망했나', '어떡하지']],
    ['답이 없어.화났나 봐.', ['답이 없어', '화났나 봐']],
    ['답이 없어 ㅠㅠ 화났나 봐 ㅋㅋ', ['답이 없어 ㅠㅠ', '화났나 봐 ㅋㅋ']],
    ['답이 없어\r화났나 봐', ['답이 없어', '화났나 봐']],
    ['읽었는데 답이 없어 화났나 봐', ['읽었는데 답이 없어 화났나 봐']],
    ['   ', []],
    ['...', []],
  ])('%s', (input, want) => expect(splitThoughts(input)).toEqual(want));
  test('8장 제한은 호출하는 쪽에서 적용(전체 개수를 돌려준다)', () => {
    expect(splitThoughts(Array(30).fill('가.').join(' ')).length).toBe(30);
    expect(MAX_CARDS).toBe(8);
  });
});

describe('detectCrisis (초안)', () => {
  test.each(['죽고 싶어', '죽고\n싶어', '자살 생각이 나', '자살', '자살할까', '살 이유가 없어', '극단적 선택 하고 싶어', '자\u200B살', '자살'.normalize('NFD')])(
    '감지: %s',
    (s) => expect(detectCrisis(s)).toBe(true),
  );
  test.each(['과자 살 거 사러 갔다가 답을 못 봤어', '모자 살까 고민했어', '여자 살 빠졌다는 말', '자살골이야', '칼로리 신경 쓰여', '친구가 답이 없어', ''])(
    '통과: %s',
    (s) => expect(detectCrisis(s)).toBe(false),
  );
});

test('growthStage (PRD FR-07)', () => {
  expect([0, 1, 2, 3, 4, 5, 50].map(growthStage)).toEqual(['엉킨 털', '풀린 털', '풀린 털', '몽실 털', '몽실 털', '구름 같은 털', '구름 같은 털']);
});

test('toMoodReduced (피그마 두 질문 → Q6)', () => {
  expect(toMoodReduced('no', 'yes')).toBe(true);
  expect(toMoodReduced('some', 'some')).toBe(true);
  expect(toMoodReduced('yes', 'yes')).toBe(true);
  expect(toMoodReduced('yes', 'some')).toBe(false);
  expect(toMoodReduced('yes', 'no')).toBe(false);
  expect(toMoodReduced('some', 'no')).toBe(false);
});
