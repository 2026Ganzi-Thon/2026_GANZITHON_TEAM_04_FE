import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, withUser, type PathType } from '../api';
import { redirectFor, Screen, useApiError } from '../components/flow';
import { PrimaryButton, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';
import { useSession } from '../store/session';

const PATHS: PathType[] = ['ACTION', 'SWITCH', 'DEFER'];

/** 피그마 '길 선택'(230:2199). 이정표 앞 말랑이 그림 + 세 경로, 추천 배지. 추천과 다른 선택도 허용(PRD FR-05) */
export default function Path() {
  const s = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const onError = useApiError();
  const [choice, setChoice] = useState<PathType | undefined>(s.selectedPath ?? s.recommendedPath);
  const [busy, setBusy] = useState(false);

  const redirect = redirectFor(s, 'path');
  if (redirect) return <Navigate to={redirect} replace />;

  async function next() {
    if (!choice || !s.sessionId) return;
    const id = s.sessionId;
    setBusy(true);
    try {
      await withUser(() => api.selectPath(id, choice));
      s.patch({ selectedPath: choice, activityDone: false });
      navigate('/s/activity');
    } catch (e) {
      onError(e, toast.show);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen step={5} back="/s/control" footer={<PrimaryButton onClick={next} disabled={!choice} busy={busy}>{copy.path.cta}</PrimaryButton>}>
      <div className="path-art" aria-hidden>
        <img className="ground" src="/mallang/mallang-path.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <img className="sheep" src="/mallang/mallang-signpost.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
      </div>
      <h1 className="title" style={{ margin: '4px 0 18px' }}>{copy.path.title}</h1>
      <div role="radiogroup" aria-label={copy.path.title} className="stack" style={{ gap: 12 }}>
        {PATHS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={choice === p} className="path-card" onClick={() => setChoice(p)}>
            <span className="path-title">{copy.path.options[p].title}</span>
            <span className="path-desc">{copy.path.options[p].desc}</span>
            {s.recommendedPath === p && <span className="badge">{copy.path.recommended}</span>}
          </button>
        ))}
      </div>
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}
