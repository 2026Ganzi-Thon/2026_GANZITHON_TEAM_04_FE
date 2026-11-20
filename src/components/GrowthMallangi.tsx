import { useEffect, useState } from 'react';
import { api, withUser, type GrowthStage } from '../api';
import { Mallangi } from './Mallangi';

/** 마이페이지와 같은 누적 걸음 기반 성장 이미지를 표시한다. 마음 무게와는 무관하다. */
export function GrowthMallangi(props: { width: number; still?: boolean }) {
  const [stage, setStage] = useState<GrowthStage>('엉킨 털');

  useEffect(() => {
    let active = true;
    withUser(() => api.mySummary())
      .then((summary) => {
        if (active) setStage(summary.growthStage);
      })
      .catch(() => {
        // 조회 실패 시 기본 이미지를 유지하고 기존 마음 정리 과정은 계속 진행한다.
      });
    return () => { active = false; };
  }, []);

  return <Mallangi {...props} stage={stage} />;
}
