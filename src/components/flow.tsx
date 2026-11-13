import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, withUser } from '../api';
import { copy } from '../content/copy';
import { useSession, type SessionState } from '../store/session';
import { BackIcon, Modal } from './ui';

export type Page = 'situation' | 'concern' | 'pick-guess' | 'pick-fact' | 'sort' | 'control' | 'path' | 'activity' | 'reflect' | 'result';

/** 화면에 들어올 때 앞 단계 값이 없으면 보낼 곳. 문제가 없으면 null */
export function redirectFor(s: SessionState, page: Page): string | null {
  if (s.completion) return page === 'result' ? null : '/s/result';
  if (!s.sessionId) return '/';
  if (page === 'result') return '/s/reflect';
  const order: [Page, boolean][] = [
    ['situation', true],
    ['concern', !!s.situationType && !!s.initialWeight],
    ['pick-guess', s.cardsReady],
    ['pick-fact', s.cardsReady],
    ['sort', s.cardsReady],
    ['control', s.classified],
    ['path', !!s.recommendedPath],
    ['activity', !!s.selectedPath],
    ['reflect', s.activityDone],
  ];
  const idx = order.findIndex(([p]) => p === page);
  for (let i = 1; i <= idx; i++) {
    if (!order[i][1]) return `/s/${order[i - 1][0]}`;
  }
  return null;
}

/** 서버 오류를 화면 동작으로 바꾼다. 위기 안내가 최우선이다. */
export function useApiError() {
  const navigate = useNavigate();
  const location = useLocation();
  const reset = useSession((s) => s.reset);
  return useCallback(
    (e: unknown, show: (msg: string) => void) => {
      if (!(e instanceof ApiError)) {
        show(copy.common.error);
        return;
      }
      switch (e.code) {
        case 'SAFETY_GUIDANCE_REQUIRED':
          navigate('/crisis', { state: { from: location.pathname, detected: true } });
          return;
        case 'SESSION_EXPIRED':
        case 'ALREADY_COMPLETED':
        case 'NOT_FOUND':
        case 'FORBIDDEN':
        case 'UNAUTHORIZED':
          reset();
          navigate('/', { replace: true, state: { notice: e.message } });
          return;
        default:
          show(e.message || copy.common.error);
      }
    },
    [navigate, location.pathname, reset],
  );
}

/** 새 정리 시작: 이 탭에 남은 진행 건은 먼저 중단(원문·카드 삭제)하고 새 세션을 만든다 */
export function useStartSession() {
  const navigate = useNavigate();
  const onError = useApiError();
  const [starting, setStarting] = useState(false);
  async function begin(show: (m: string) => void, preset?: { situationType?: SessionState['situationType'] }) {
    if (starting) return;
    setStarting(true);
    try {
      const prev = useSession.getState().sessionId;
      if (prev && !useSession.getState().completion) await withUser(() => api.deleteSession(prev)).catch(() => undefined);
      const { sessionId } = await withUser(() => api.createSession());
      useSession.getState().start(sessionId);
      if (preset?.situationType) useSession.getState().patch({ situationType: preset.situationType });
      navigate('/s/situation');
    } catch (e) {
      onError(e, show);
    } finally {
      setStarting(false);
    }
  }
  return { begin, starting };
}

/**
 * 카드 고르기 결과(picks)를 서버 분류로 저장한다. 고르지 않은 카드는 UNCLASSIFIED.
 * 서버 값과 다른 카드만 보낸다(요청 항목만 바뀌고 나머지는 유지됨).
 */
export function useSaveClassification() {
  const onError = useApiError();
  return async (show: (m: string) => void): Promise<boolean> => {
    const s = useSession.getState();
    if (!s.sessionId) return false;
    const id = s.sessionId;
    const items = s.cards
      .map((c) => ({ cardId: c.cardId, category: s.picks[c.cardId] ?? ('UNCLASSIFIED' as const) }))
      .filter((it) => s.cards.find((c) => c.cardId === it.cardId)!.category !== it.category);
    try {
      if (items.length > 0) {
        const r = await withUser(() => api.classifyCards(id, items));
        s.patch({ cards: r.cards });
      }
      useSession.getState().patch({ classified: true });
      return true;
    } catch (e) {
      onError(e, show);
      return false;
    }
  };
}

/** 새로고침 뒤 카드가 메모리에 없으면 서버에서 다시 받는다 */
export function useCards(show: (m: string) => void) {
  const { sessionId, cards, cardsReady, patch } = useSession();
  const onError = useApiError();
  const [loading, setLoading] = useState(cardsReady && cards.length === 0);
  useEffect(() => {
    if (!sessionId || !cardsReady || cards.length > 0) return;
    let alive = true;
    setLoading(true);
    withUser(() => api.getCards(sessionId))
      .then((r) => alive && patch({ cards: r.cards }))
      .catch((e) => alive && onError(e, show))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, cardsReady]);
  return { cards, loading };
}

/**
 * 세션 화면 공통 틀: 뒤로 가기 / 진행 점 6개 / 그만하기, 아래쪽 버튼 영역과 '지금 도움받기'.
 * 도움받기는 모든 세션 화면에 고정한다(HANDOFF 검증 C3).
 */
export function Screen(props: { step?: number; back?: string | false; quit?: boolean; children: ReactNode; footer?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, reset } = useSession();
  const [confirm, setConfirm] = useState(false);

  async function quit() {
    setConfirm(false);
    if (sessionId) {
      try {
        await withUser(() => api.deleteSession(sessionId));
      } catch {
        /* 이미 끝난 세션이어도 첫 화면으로 */
      }
    }
    reset();
    navigate('/', { replace: true });
  }

  return (
    <div className="screen">
      <header className="top">
        <div className="top-left">
          {props.back !== false && (
            <button type="button" className="icon-btn" aria-label={copy.common.back} onClick={() => (props.back ? navigate(props.back) : navigate(-1))}>
              <BackIcon />
            </button>
          )}
        </div>
        {props.step ? (
          <div className="dots" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={props.step} aria-label={`${props.step}/6 단계`}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={`dot${i < props.step! ? ' on' : ''}`} />
            ))}
          </div>
        ) : (
          <div />
        )}
        <div className="top-right">
          {props.quit !== false && (
            <button type="button" className="text-btn" onClick={() => setConfirm(true)}>
              {copy.common.quit}
            </button>
          )}
        </div>
      </header>
      <main className="body">{props.children}</main>
      <footer className="foot">
        {props.footer}
        <button type="button" className="help-link" onClick={() => navigate('/crisis', { state: { from: location.pathname } })}>
          {copy.common.helpNow}
        </button>
      </footer>
      {confirm && (
        <Modal
          title={copy.common.quitConfirm}
          actions={[
            { label: copy.common.quitNo, onClick: () => setConfirm(false) },
            { label: copy.common.quitYes, onClick: quit, kind: 'secondary' },
          ]}
        />
      )}
    </div>
  );
}
