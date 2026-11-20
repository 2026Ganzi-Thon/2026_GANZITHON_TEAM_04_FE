import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, withUser } from '../api';
import { redirectFor, Screen, useApiError } from '../components/flow';
import { Mallangi } from '../components/Mallangi';
import { GrowthMallangi } from '../components/GrowthMallangi';
import { ChoiceGroup, PrimaryButton, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';
import { toMoodReduced, type Three } from '../domain/reflect';
import { useSession } from '../store/session';

/**
 * 피그마 두 번째 '길 선택'(230:2233) = 마음 변화 확인. 두 질문(응·조금·아니)을 받아
 * API의 Q6 moodReduced(boolean)로 바꿔 보낸다(규칙은 domain/reflect.ts).
 */
const MIN_LOADING_MS = 1400;

export default function Reflect() {
  const s = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const onError = useApiError();
  const [stuck, setStuck] = useState<Three>();
  const [moveOn, setMoveOn] = useState<Three>();
  const [loading, setLoading] = useState(false);

  const redirect = redirectFor(s, 'reflect');
  if (redirect) return <Navigate to={redirect} replace />;

  async function submit() {
    if (!stuck || !moveOn || !s.sessionId || loading) return;
    const id = s.sessionId;
    setLoading(true);
    try {
      const [result] = await Promise.all([
        withUser(() => api.complete(id, toMoodReduced(stuck, moveOn))),
        new Promise((r) => setTimeout(r, MIN_LOADING_MS)), // 피그마 '결과 로딩화면'을 잠깐 보여 준다
      ]);
      s.patch({ completion: result, cards: [], draft: '', picks: {} });
      navigate('/s/result', { replace: true });
    } catch (e) {
      setLoading(false);
      onError(e, toast.show);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="loading" role="status" aria-live="polite">
          <Mallangi variant="loading" width={254} label="털실을 푸는 말랑이" />
          <p>{copy.reflect.loading}</p>
        </div>
      </div>
    );
  }

  const q1 = (['yes', 'some', 'no'] as Three[]).map((v) => ({ value: v, label: copy.reflect.q1Options[v] }));
  const q2 = (['yes', 'no', 'some'] as Three[]).map((v) => ({ value: v, label: copy.reflect.q2Options[v] }));

  return (
    <Screen step={6} back="/s/activity" footer={<PrimaryButton onClick={submit} disabled={!stuck || !moveOn}>{copy.reflect.cta}</PrimaryButton>}>
      <div className="head-row">
        <GrowthMallangi width={91} still />
        <p className="bubble outline" style={{ fontSize: 15 }}>{copy.reflect.bubble}</p>
      </div>
      <p className="q" style={{ marginTop: 36 }}>{copy.reflect.q1}</p>
      <ChoiceGroup label={copy.reflect.q1} className="grid3" options={q1} value={stuck} onChange={setStuck} />
      <p className="q" style={{ marginTop: 40 }}>{copy.reflect.q2}</p>
      <ChoiceGroup label={copy.reflect.q2} className="grid3" options={q2} value={moveOn} onChange={setMoveOn} />
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}
