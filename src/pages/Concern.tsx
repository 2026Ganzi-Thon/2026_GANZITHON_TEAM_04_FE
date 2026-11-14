import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError, withUser } from '../api';
import { redirectFor, Screen, useApiError } from '../components/flow';
import { Mallangi } from '../components/Mallangi';
import { PrimaryButton, Spinner, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';
import { countGraphemes, isBlank, MAX_CONCERN_CHARS, sliceGraphemes } from '../domain/text';
import { useSession } from '../store/session';

export default function Concern() {
  const s = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const onError = useApiError();
  const [busy, setBusy] = useState(false);

  const redirect = redirectFor(s, 'concern');
  if (redirect) return <Navigate to={redirect} replace />;

  const text = s.draft;
  const count = countGraphemes(text);

  async function submit() {
    if (isBlank(text) || !s.sessionId) return;
    const id = s.sessionId;
    setBusy(true);
    try {
      // 서버가 위기 검사 후 저장. 내용이 바뀌면 서버가 기존 카드·핵심·추천·경로를 초기화한다.
      await withUser(() => api.putConcernText(id, text));
      let result: Awaited<ReturnType<typeof api.generateCards>> | null = null;
      try {
        result = await withUser(() => api.generateCards(id));
      } catch (e) {
        // 같은 글로 다시 들어온 경우: 이미 만든 카드를 그대로 쓴다
        if (!(e instanceof ApiError && e.code === 'CARDS_ALREADY_EXIST')) throw e;
      }
      const cards = result ? result.cards : (await withUser(() => api.getCards(id))).cards;
      s.patch({ cards, cardsReady: true });
      if (result) {
        s.patch({ picks: {} });
        s.invalidateFromCards();
      }
      navigate('/s/pick-guess', { state: { truncated: result?.truncated ?? false } });
    } catch (e) {
      onError(e, toast.show);
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <Screen step={2} back={false} quit={false}>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Mallangi variant="loading" width={200} />
            <Spinner label={copy.concern.generating} />
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen step={2} back="/s/situation" footer={<PrimaryButton onClick={submit} disabled={isBlank(text)}>{copy.concern.cta}</PrimaryButton>}>
      <div className="head-row">
        <Mallangi variant="default" width={91} still />
        <p className="bubble" style={{ flex: 1 }}>{copy.concern.prompt}</p>
      </div>
      <label className="textarea-wrap">
        <span className="sr-only">{copy.concern.prompt}</span>
        <textarea
          className="textarea"
          value={text}
          placeholder={copy.concern.placeholder}
          onChange={(e) => {
            const v = e.target.value;
            s.patch({ draft: countGraphemes(v) > MAX_CONCERN_CHARS ? sliceGraphemes(v, MAX_CONCERN_CHARS) : v });
          }}
        />
        <span className="counter" aria-live="polite">{copy.concern.counter(count)}</span>
      </label>
      <p className="sub" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, textAlign: 'left' }}>{copy.concern.aiNotice}</p>
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}
