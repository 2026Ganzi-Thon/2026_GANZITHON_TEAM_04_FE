import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError, withUser, type SwitchActivity } from '../api';
import { redirectFor, Screen, useApiError } from '../components/flow';
import { GrowthMallangi } from '../components/GrowthMallangi';
import { PrimaryButton, Spinner, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';
import { countGraphemes, isBlank, MAX_CONCERN_CHARS, sliceGraphemes } from '../domain/text';
import { useSession } from '../store/session';

/** 경로별 활동 화면. 고른 행동·활동·직접 입력은 어디에도 저장하지 않는다(PRD FR-06) */
export default function Activity() {
  const s = useSession();
  const redirect = redirectFor(s, 'activity');
  if (redirect) return <Navigate to={redirect} replace />;
  if (s.selectedPath === 'ACTION') return <ActionStep />;
  if (s.selectedPath === 'SWITCH') return <SwitchStep />;
  return <DeferStep />;
}

function useFinish() {
  const patch = useSession((s) => s.patch);
  const navigate = useNavigate();
  return () => {
    patch({ activityDone: true });
    navigate('/s/reflect');
  };
}

function ActionStep() {
  const sessionId = useSession((s) => s.sessionId);
  const finish = useFinish();
  const toast = useToast();
  const onError = useApiError();
  const [actions, setActions] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<number | 'custom' | null>(null);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    withUser(() => api.actionRecommendations(sessionId))
      .then((r) => alive && setActions(r.actions))
      .catch((e) => alive && onError(e, toast.show)); // 위기면 상담 안내로 이동, 일반 추천·폴백 없음
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function next() {
    if (picked === 'custom') {
      if (isBlank(custom)) return;
      setBusy(true);
      try {
        // 직접 입력은 진행 전에 서버 위기 검사만 하고 저장하지 않는다
        const r = await withUser(() => api.safetyCheck(custom));
        if (r.detected) {
          onError(new ApiError('SAFETY_GUIDANCE_REQUIRED', '', 409), toast.show);
          return;
        }
      } catch (e) {
        onError(e, toast.show);
        return;
      } finally {
        setBusy(false);
      }
    }
    finish();
  }

  return (
    <Screen
      step={5}
      back="/s/path"
      footer={
        <>
          <PrimaryButton onClick={next} busy={busy} disabled={picked === null || (picked === 'custom' && isBlank(custom))}>
            {copy.action.cta}
          </PrimaryButton>
          <button type="button" className="text-btn" onClick={finish}>{copy.action.skip}</button>
        </>
      }
    >
      <div className="head-row">
        <GrowthMallangi width={91} still />
        <h1 className="title" style={{ textAlign: 'left', margin: 0 }}>{copy.action.title}</h1>
      </div>
      {!actions ? (
        <Spinner />
      ) : (
        <div role="radiogroup" aria-label={copy.action.title} className="stack">
          {actions.map((a, i) => (
            <button key={a} type="button" role="radio" aria-checked={picked === i} className="option-row" onClick={() => setPicked(i)}>
              {a}
            </button>
          ))}
          <button type="button" role="radio" aria-checked={picked === 'custom'} className="option-row" onClick={() => setPicked('custom')}>
            {copy.action.custom}
          </button>
          {picked === 'custom' && (
            <div className="edit-box">
              <label className="sr-only" htmlFor="custom-action">{copy.action.customPlaceholder}</label>
              <textarea
                id="custom-action"
                autoFocus
                value={custom}
                placeholder={copy.action.customPlaceholder}
                onChange={(e) => setCustom(countGraphemes(e.target.value) > MAX_CONCERN_CHARS ? sliceGraphemes(e.target.value, MAX_CONCERN_CHARS) : e.target.value)}
              />
            </div>
          )}
        </div>
      )}
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}

function SwitchStep() {
  const finish = useFinish();
  const toast = useToast();
  const onError = useApiError();
  const [list, setList] = useState<SwitchActivity[] | null>(null);
  const [picked, setPicked] = useState<SwitchActivity['id'] | null>(null);

  useEffect(() => {
    let alive = true;
    withUser(() => api.switchActivities())
      .then((r) => alive && setList(r.activities))
      .catch((e) => alive && onError(e, toast.show));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = list?.find((a) => a.id === picked);

  return (
    <Screen step={5} back="/s/path" footer={<PrimaryButton onClick={finish} disabled={!picked}>{copy.switch.cta}</PrimaryButton>}>
      <div className="head-row">
        <GrowthMallangi width={91} still />
        <h1 className="title" style={{ textAlign: 'left', margin: 0 }}>{copy.switch.title}</h1>
      </div>
      <p className="sub" style={{ marginBottom: 12 }}>{copy.switch.pick}</p>
      {!list ? (
        <Spinner />
      ) : (
        <div role="radiogroup" aria-label={copy.switch.pick} className="stack">
          {list.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={picked === a.id} className="choice" onClick={() => setPicked(a.id)}>
              {a.title}
            </button>
          ))}
        </div>
      )}
      {current && (
        <p className="guide-box" aria-live="polite">{current.guide}</p>
      )}
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}

function DeferStep() {
  const finish = useFinish();
  return (
    <Screen step={5} back="/s/path" footer={<PrimaryButton onClick={finish}>{copy.defer.cta}</PrimaryButton>}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <GrowthMallangi width={129} />
        <h1 className="title" style={{ margin: 0 }}>{copy.defer.title}</h1>
        <p className="sub">{copy.defer.body}</p>
      </div>
    </Screen>
  );
}
