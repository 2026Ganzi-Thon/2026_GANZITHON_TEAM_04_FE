import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, withUser, type SafetyGuide } from '../api';
import { Mallangi } from '../components/Mallangi';
import { BackIcon } from '../components/ui';
import { copy } from '../content/copy';
import { useSession } from '../store/session';

/** 기본 연락처. 서버 안내를 못 받아도 109는 항상 보여 준다 */
const FALLBACK: SafetyGuide[] = [{ guideType: 'CRISIS', name: '자살예방상담전화', contact: '109', url: null }];

/**
 * 상담 안내. 위기 감지·'지금 도움받기'·결과 화면 상담 링크에서 온다.
 * 세션은 지우지 않는다. 사용자는 돌아가서 다시 쓰거나 처음으로 갈 수 있다(PRD FR-08, HANDOFF C2).
 */
export default function Crisis() {
  const navigate = useNavigate();
  const location = useLocation();
  const { from, detected } = (location.state ?? {}) as { from?: string; detected?: boolean };
  const { sessionId, completion, reset } = useSession();
  const [guides, setGuides] = useState<SafetyGuide[]>(FALLBACK);

  useEffect(() => {
    let alive = true;
    api
      .safetyGuides()
      .then((r) => alive && r.guides.length > 0 && setGuides(r.guides))
      .catch(() => {
        /* 기본 연락처 유지 */
      });
    return () => {
      alive = false;
    };
  }, []);

  async function goHome() {
    // 진행 중이던 정리는 중단(원문·카드 삭제)하고 첫 화면으로
    if (sessionId && !completion) await withUser(() => api.deleteSession(sessionId)).catch(() => undefined);
    reset();
    navigate('/', { replace: true });
  }

  return (
    <div className="screen">
      <header className="top">
        <div className="top-left">
          {from && (
            <button type="button" className="icon-btn" aria-label={copy.common.back} onClick={() => navigate(-1)}>
              <BackIcon />
            </button>
          )}
        </div>
        <div />
        <div />
      </header>
      <main className="body" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Mallangi variant="crisis" width={173} still />
        <h1 className="title" style={{ marginBottom: 6 }}>{detected ? copy.crisis.title : copy.crisis.helpTitle}</h1>
        <p className="sub" style={{ fontSize: 15, marginBottom: 28 }}>{detected ? copy.crisis.subtitle : copy.crisis.helpSubtitle}</p>
        <div className="stack" style={{ width: '100%', gap: 12 }}>
          {guides.map((g, i) =>
            g.contact ? (
              <a key={g.contact + i} className={`crisis-card${i === 0 ? ' strong' : ''}`} href={`tel:${g.contact.replace(/[^0-9]/g, '')}`}>
                <b>{copy.crisis.call(g.contact)}</b>
                <span>{copy.crisis.callDesc}</span>
              </a>
            ) : g.url ? (
              <a key={g.url} className="crisis-card" href={g.url} target="_blank" rel="noreferrer noopener">
                <b>{g.name}</b>
              </a>
            ) : null,
          )}
          {/* TODO(출시 전): 마들랜 실제 연결 수단 확인 후 서버 안내(GET /safety/guides)로 내려받는다 */}
          {!guides.some((g) => g.name.includes('마들랜')) && (
            <div className="crisis-card pending" aria-disabled>
              <b>{copy.crisis.madlen}</b>
              <span>{copy.crisis.madlenDesc} · {copy.crisis.madlenPending}</span>
            </div>
          )}
        </div>
        <p className="sub" style={{ marginTop: 20 }}>{copy.crisis.emergency}</p>
        <p className="sub" style={{ marginTop: 4, fontSize: 12 }}>{copy.crisis.disclaimer}</p>
      </main>
      <footer className="foot">
        {from && from !== '/' && (
          <button type="button" className="secondary" onClick={() => navigate(-1)}>
            {detected ? copy.crisis.goBack : copy.crisis.back}
          </button>
        )}
        <button type="button" className="text-btn" style={{ fontSize: 15 }} onClick={goHome}>
          {copy.crisis.home}
        </button>
      </footer>
    </div>
  );
}
