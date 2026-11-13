import type { CanAct, PathType, Weight } from '../api/types';

/**
 * PRD v2.0 FR-05 경로 추천 규칙. 실제 추천은 서버가 하고, 이 함수는 가짜 API와 테스트에서 쓴다.
 *
 * | Q4 | Q5 | 초기 1~3 | 초기 4~5 |
 * | 있어 | 아니/응 | ACTION | SWITCH |
 * | 없어·몰라 | 응 | DEFER | DEFER |
 * | 없어·몰라 | 아니 | DEFER | SWITCH |
 */
export function recommendPath(canAct: CanAct, needsTime: boolean, initialWeight: Weight): PathType {
  if (!['HAS_ACTION', 'NO_ACTION', 'UNKNOWN'].includes(canAct)) throw new Error(`invalid canAct: ${canAct}`);
  if (typeof needsTime !== 'boolean') throw new Error('needsTime must be boolean');
  if (![1, 2, 3, 4, 5].includes(initialWeight)) throw new Error(`invalid weight: ${initialWeight}`);
  const heavy = initialWeight >= 4;
  if (canAct === 'HAS_ACTION') return heavy ? 'SWITCH' : 'ACTION';
  if (needsTime) return 'DEFER';
  return heavy ? 'SWITCH' : 'DEFER';
}
