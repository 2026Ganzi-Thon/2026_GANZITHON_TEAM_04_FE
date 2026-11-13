import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, withUser, type GrowthStage } from '../api';
import { useStartSession } from '../components/flow';
import { Mallangi } from '../components/Mallangi';
import { Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { begin: startSession, starting } = useStartSession();
  const [summary, setSummary] = useState<{ stepCount: number; growthStage: GrowthStage } | null>(null);
  const [reminders, setReminders] = useState(0);

  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (notice) toast.show(notice);
    let alive = true;
    withUser(() => Promise.all([api.mySummary(), api.reminderStatus()]))
      .then(([s, r]) => {
        if (!alive) return;
        setSummary(s);
        setReminders(r.showNotification ? r.count : 0);
      })
      .catch(() => {
        /* 첫 화면은 요약 없이도 시작할 수 있다 */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = () => startSession(toast.show);

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  return (
    <div className="screen home" onClick={begin} role="button" tabIndex={0} aria-label={copy.home.tapToStart} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && begin()}>
      <div className="home-top" onClick={stop} onKeyDown={stop}>
        <button type="button" className="home-link" onClick={() => navigate('/me')}>
          {copy.home.myPage}
        </button>
        {/* 피그마 첫 화면 우상단 말풍선 + 숫자 배지: 미뤄 둔 생각 개수. 0개면 숨김(PRD FR-11) */}
        {reminders > 0 && (
          <button type="button" className="bell" onClick={() => navigate('/reminders')} aria-label={copy.home.reminders(reminders)}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 3.5c4.97 0 9 3.36 9 7.5s-4.03 7.5-9 7.5c-.93 0-1.83-.12-2.67-.33L5 20l1.06-3.47C4.17 15.17 3 13.2 3 11c0-4.14 4.03-7.5 9-7.5Z" fill="currentColor" />
              <circle cx="8.5" cy="11" r="1.2" fill="var(--white)" />
              <circle cx="12" cy="11" r="1.2" fill="var(--white)" />
              <circle cx="15.5" cy="11" r="1.2" fill="var(--white)" />
            </svg>
            <span className="count">{reminders}</span>
          </button>
        )}
      </div>

      <h1 className="headline">
        {copy.home.headline1}
        <br />
        <span className="logo">{copy.home.headline2Logo}</span>
        {copy.home.headline2Rest}
      </h1>

      <div className="home-center">
        <Mallangi variant="home" width={199} label={summary ? `말랑이 (${summary.growthStage} · ${summary.stepCount}걸음)` : '말랑이'} />
        <div className="tap-hint" aria-hidden>
          <svg width="18" height="12" viewBox="0 0 18 12" style={{ marginTop: 28 }}>
            <path d="M2 2l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {starting ? copy.common.loading : copy.home.tapToStart}
        </div>
      </div>

      <div className="home-foot" onClick={stop} onKeyDown={stop}>
        <p className="notice">{copy.home.notice}</p>
        <button type="button" className="help-link" onClick={() => navigate('/crisis', { state: { from: '/' } })}>
          {copy.common.helpNow}
        </button>
      </div>
      <Toast message={toast.message} onDone={toast.clear} />
    </div>
  );
}
