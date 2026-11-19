import { useState } from 'react';
import type { GrowthStage } from '../api/types';

/**
 * 말랑이(양) 일러스트. 피그마 최종본 '전체 화면'(229:1008)에서 내보낸 그림을 public/mallang/에 둔다.
 * - home: 첫 화면 큰 말랑이 · default: 기본(엉킨 털) · loosened: 털이 풀린 결과
 * - cards: 카드 고르기 머리 그림 · loading: 털 푸는 중 · crisis: 상담 안내
 * 그림 파일이 없으면 같은 크기의 자리표시 원을 보여 준다.
 */
export type MallangiVariant = 'home' | 'default' | 'loosened' | 'cards' | 'loading' | 'crisis';

/** 마이페이지 성장 단계별 그림. 풀린 털과 몽실 털은 같은 그림을 사용한다. */
const BY_STAGE: Record<GrowthStage, { src: string; ratio: number }> = {
  '엉킨 털': { src: '/mallang/mallang-growth-tangled.png', ratio: 314 / 258 },
  '풀린 털': { src: '/mallang/mallang-growth-soft.png', ratio: 314 / 256 },
  '몽실 털': { src: '/mallang/mallang-growth-soft.png', ratio: 314 / 256 },
  '구름 같은 털': { src: '/mallang/mallang-growth-cloud.png', ratio: 270 / 210 },
};

const RATIO: Record<MallangiVariant, number> = {
  home: 251 / 199,
  default: 599 / 491,
  loosened: 518 / 401,
  cards: 398 / 530,
  loading: 658 / 700,
  crisis: 660 / 658,
};

export function Mallangi(props: { variant?: MallangiVariant; stage?: GrowthStage; width: number; label?: string; still?: boolean }) {
  const variant = props.variant ?? 'default';
  const stageImage = !props.variant && props.stage ? BY_STAGE[props.stage] : undefined;
  const [broken, setBroken] = useState(false);
  const height = Math.round(props.width * (stageImage?.ratio ?? RATIO[variant]));
  const alt = props.label ?? (props.stage ? `말랑이 (${props.stage})` : '말랑이');
  if (broken) {
    return <div role="img" aria-label={alt} style={{ width: props.width, height, borderRadius: '50%', background: 'var(--cream)', flexShrink: 0 }} />;
  }
  return (
    <img
      src={stageImage?.src ?? `/mallang/mallang-${variant}.png`}
      alt={alt}
      width={props.width}
      height={height}
      className={props.still ? undefined : 'bob'}
      style={{ objectFit: 'contain', flexShrink: 0 }}
      onError={() => setBroken(true)}
      draggable={false}
    />
  );
}
