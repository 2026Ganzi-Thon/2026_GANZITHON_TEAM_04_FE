import { Navigate, useNavigate } from 'react-router-dom';
import { redirectFor, Screen } from '../components/flow';
import { Mallangi } from '../components/Mallangi';
import { PrimaryButton } from '../components/ui';
import { copy } from '../content/copy';
import { useSession } from '../store/session';

/**
 * 피그마 '결과'(230:2277) / 악화 변형(232:3012).
 * 피그마는 '처음 4 → 지금 2'처럼 숫자를 보여 주지만 API는 줄었는지(boolean)만 받으므로 오른쪽 원은 말로 보여 준다.
 * 뒤로 가기 없음. 브라우저 뒤로 가기로 앞 화면에 가도 completion이 있어 이 화면으로 되돌아온다.
 */
export default function Result() {
  const s = useSession();
  const navigate = useNavigate();
  const redirect = redirectFor(s, 'result');
  if (redirect) return <Navigate to={redirect} replace />;
  const { reflection, showCounselingLink } = s.completion!;
  const reduced = reflection.moodReduced;
  const nowLabel = copy.result.nowLabel[String(reduced) as 'true' | 'false'];

  function finish() {
    s.reset();
    navigate('/', { replace: true });
  }

  return (
    <Screen step={6} back={false} quit={false} footer={<PrimaryButton onClick={finish}>{copy.result.cta}</PrimaryButton>}>
      <div className="result" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Mallangi variant={reduced ? 'loosened' : 'default'} width={reduced ? 174 : 200} />
        <p className="result-msg">{copy.result.byPath[reflection.selectedPath]}</p>
        <div className="compare" role="img" aria-label={`${copy.result.compare}: ${reflection.initialWeight} → ${nowLabel}`}>
          <span className="c">{reflection.initialWeight}</span>
          <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden>
            <path d="M1 7h30m-6-5 6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-sub)' }} />
          </svg>
          <span className="c now" style={{ width: 'auto', padding: '0 12px', borderRadius: 20, fontSize: 12 }}>{nowLabel}</span>
        </div>
        <p className="compare-cap">{copy.result.compare}</p>
        {showCounselingLink && (
          <button type="button" className="still-heavy" onClick={() => navigate('/crisis', { state: { from: '/s/result' } })}>
            {copy.result.stillHeavy}
          </button>
        )}
      </div>
    </Screen>
  );
}
