import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, withUser, type CanAct } from '../api';
import { redirectFor, Screen, useApiError, useCards } from '../components/flow';
import { ChoiceGroup, PrimaryButton, Spinner, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';
import { useSession } from '../store/session';

const Q4 = (['HAS_ACTION', 'NO_ACTION', 'UNKNOWN'] as CanAct[]).map((v) => ({ value: v, label: copy.control.q4Options[v] }));
const Q5 = [
  { value: 'yes' as const, label: copy.control.q5Options.yes },
  { value: 'no' as const, label: copy.control.q5Options.no },
];

/**
 * 피그마 '선택'(230:2153): 제일 신경 쓰이는 건? · 지금 할 수 있는 게 있어? · 답을 알려면 시간이 필요해?
 * 핵심 카드는 분류와 무관하게 전체 카드에서 고른다(PRD FR-04). 추측 카드를 앞에 둔다.
 */
export default function Control() {
  const s = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const onError = useApiError();
  const { cards, loading } = useCards(toast.show);
  const [busy, setBusy] = useState(false);

  const redirect = redirectFor(s, 'control');
  if (redirect) return <Navigate to={redirect} replace />;

  const ordered = [...cards].sort((a, b) => Number(b.category === 'ASSUMPTION') - Number(a.category === 'ASSUMPTION'));
  const core = cards.some((c) => c.cardId === s.coreCardId) ? s.coreCardId : undefined;
  const q5 = s.needsTime === undefined ? undefined : s.needsTime ? 'yes' : 'no';
  const ready = core !== undefined && !!s.canAct && s.needsTime !== undefined;

  async function next() {
    if (!ready || !s.sessionId) return;
    const id = s.sessionId;
    setBusy(true);
    try {
      const r = await withUser(() => api.recommendPath(id, { coreCardId: core!, canAct: s.canAct!, needsTime: s.needsTime! }));
      s.patch({ recommendedPath: r.recommendedPath, selectedPath: undefined, activityDone: false });
      navigate('/s/path');
    } catch (e) {
      onError(e, toast.show);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen step={4} back="/s/pick-fact" footer={<PrimaryButton onClick={next} disabled={!ready} busy={busy}>{copy.control.cta}</PrimaryButton>}>
      <p className="q" style={{ marginTop: 32 }}>{copy.control.q3}</p>
      {loading ? (
        <Spinner />
      ) : (
        <ChoiceGroup
          label={copy.control.q3}
          className="wrap"
          options={ordered.map((c) => ({ value: String(c.cardId), label: c.content }))}
          value={core === undefined ? undefined : String(core)}
          onChange={(v) => s.patch({ coreCardId: Number(v) })}
        />
      )}
      <p className="q" style={{ marginTop: 48 }}>{copy.control.q4}</p>
      <ChoiceGroup label={copy.control.q4} className="grid3" options={Q4} value={s.canAct} onChange={(v) => s.patch({ canAct: v })} />
      <p className="q" style={{ marginTop: 48 }}>{copy.control.q5}</p>
      <ChoiceGroup label={copy.control.q5} className="grid2" options={Q5} value={q5} onChange={(v) => s.patch({ needsTime: v === 'yes' })} />
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}
