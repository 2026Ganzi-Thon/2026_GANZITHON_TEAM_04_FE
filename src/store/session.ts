import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CanAct, Card, CardCategory, CompletionResult, PathType, SituationType, Weight } from '../api/types';

/**
 * 진행 중인 한 번의 마음 정리. 탭의 sessionStorage에 두어 같은 탭 새로고침은 이어지고,
 * 탭을 닫으면 사라진다(API 명세 3장). 고민 원문과 카드 내용은 저장하지 않는다(카드는 서버에서 다시 받는다).
 */
export interface SessionState {
  sessionId?: number;
  situationType?: SituationType;
  initialWeight?: Weight;
  /** 메모리만. 새로고침하면 사라진다 */
  draft: string;
  cards: Card[];
  cardsReady: boolean;
  /** 카드 고르기 화면에서 고른 분류(카드 id → FACT/ASSUMPTION). 고르지 않은 카드는 미분류 */
  picks: Record<number, CardCategory>;
  /** 분류를 서버에 저장했는지 */
  classified: boolean;
  coreCardId?: number;
  canAct?: CanAct;
  needsTime?: boolean;
  recommendedPath?: PathType;
  selectedPath?: PathType;
  activityDone: boolean;
  completion?: CompletionResult;

  start(sessionId: number): void;
  patch(p: Partial<Omit<SessionState, 'start' | 'patch' | 'reset' | 'invalidateFromCards'>>): void;
  /** 카드가 바뀌면 그 뒤 단계 답을 지운다 */
  invalidateFromCards(opts?: { keepCore?: boolean }): void;
  reset(): void;
}

const initial = {
  sessionId: undefined,
  situationType: undefined,
  initialWeight: undefined,
  draft: '',
  cards: [] as Card[],
  cardsReady: false,
  picks: {} as Record<number, CardCategory>,
  classified: false,
  coreCardId: undefined,
  canAct: undefined,
  needsTime: undefined,
  recommendedPath: undefined,
  selectedPath: undefined,
  activityDone: false,
  completion: undefined,
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...initial,
      start: (sessionId) => set({ ...initial, sessionId }),
      patch: (p) => set(p),
      invalidateFromCards: (opts) =>
        set((s) => ({
          classified: false,
          coreCardId: opts?.keepCore ? s.coreCardId : undefined,
          recommendedPath: undefined,
          selectedPath: undefined,
          activityDone: false,
        })),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'mallang/session/v1',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        sessionId: s.sessionId,
        situationType: s.situationType,
        initialWeight: s.initialWeight,
        cardsReady: s.cardsReady,
        picks: s.picks,
        classified: s.classified,
        coreCardId: s.coreCardId,
        canAct: s.canAct,
        needsTime: s.needsTime,
        recommendedPath: s.recommendedPath,
        selectedPath: s.selectedPath,
        activityDone: s.activityDone,
        completion: s.completion,
      }),
    },
  ),
);
