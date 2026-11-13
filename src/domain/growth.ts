import type { GrowthStage } from '../api/types';

/** PRD FR-07: 0 엉킨 털, 1~2 풀린 털, 3~4 몽실 털, 5 이상 구름 같은 털. 기록 삭제로 걸음이 줄면 단계도 내려간다. */
export function growthStage(steps: number): GrowthStage {
  if (steps >= 5) return '구름 같은 털';
  if (steps >= 3) return '몽실 털';
  if (steps >= 1) return '풀린 털';
  return '엉킨 털';
}
