import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStartSession } from '../components/flow';
import { growthStage } from '../domain/growth';
import { api, ApiError, withUser, type GrowthStage, type ReflectionSummary, type Reminder } from '../api';
import { Mallangi } from '../components/Mallangi';
import { BackIcon, Modal, Spinner, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';

const PAGE_SIZE = 20;

/** 목록에서 들어왔으면 뒤로, 주소로 바로 들어왔으면 목록으로 교체 */
function useBackToList() {
  const navigate = useNavigate();
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/me', { replace: true });
  };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function daysAgo(iso: string) {
  const start = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((start(new Date()) - start(new Date(iso))) / 86_400_000);
}
const pathName = (p: ReflectionSummary['selectedPath']) => copy.path.options[p].title;
const situationName = (s: ReflectionSummary['situationType']) => copy.situation.options[s];

function Page({ title, children, overlay }: { title: string; children: ReactNode; overlay?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className={`screen${overlay ? ' overlay-page' : ''}`}>
      {overlay && (
        <div className="home-ghost" aria-hidden>
          <p className="headline">
            {copy.home.headline1}
            <br />
            <span className="logo">{copy.home.headline2Logo}</span>
            {copy.home.headline2Rest}
          </p>
          <img src="/mallang/mallang-home.png" alt="" width={199} />
        </div>
      )}
      <header className="top">
        <div className="top-left">
          <button type="button" className="icon-btn" aria-label={copy.common.back} onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
        </div>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, textAlign: 'center', color: 'var(--title)', whiteSpace: 'nowrap' }}>{title}</h1>
        <div />
      </header>
      <main className="body">{children}</main>
    </div>
  );
}

/** 마이페이지: 누적 걸음·성장 상태·완료 기록 최신순(PRD FR-10) */
export function MyPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [summary, setSummary] = useState<{ stepCount: number; growthStage: GrowthStage } | null>(null);
  const [items, setItems] = useState<ReflectionSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    withUser(() => Promise.all([api.mySummary(), api.listReflections(0, PAGE_SIZE)]))
      .then(([s, r]) => {
        setSummary(s);
        setItems(r.items);
        setTotal(r.totalElements);
      })
      .catch((e) => toast.show(e instanceof ApiError ? e.message : copy.common.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function more() {
    setLoadingMore(true);
    try {
      const r = await withUser(() => api.listReflections(page + 1, PAGE_SIZE));
      setItems((prev) => [...(prev ?? []), ...r.items]);
      setTotal(r.totalElements);
      setPage(page + 1);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : copy.common.error);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Page title={copy.myPage.title}>
      {summary && (
        <div className="stat">
          <Mallangi width={64} stage={summary.growthStage} still />
          <div style={{ flex: 1 }}>
            <div className="row">
              <span style={{ fontWeight: 700, fontSize: 18 }}>{summary.growthStage}</span>
              <span className="sub">{copy.myPage.steps(summary.stepCount)}</span>
            </div>
            <StageProgress steps={summary.stepCount} />
          </div>
        </div>
      )}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="empty">{copy.myPage.empty}</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {items.map((r) => (
            <button key={r.reflectionId} type="button" className="list-item" onClick={() => navigate(`/me/${r.reflectionId}`)}>
              <span className="row">
                <span className="main">{situationName(r.situationType)} · {pathName(r.selectedPath)}</span>
                <span className="meta">{formatDate(r.completedAt)}</span>
              </span>
              <span className="meta" style={{ fontWeight: 400 }}>
                {copy.myPage.weight(r.initialWeight)} · {r.moodReduced ? '무게 줄었어' : '무게 그대로'}
              </span>
            </button>
          ))}
          {items.length < total && (
            <button type="button" className="secondary" onClick={more} disabled={loadingMore}>
              {loadingMore ? copy.common.loading : copy.myPage.more}
            </button>
          )}
        </div>
      )}
      <Toast message={toast.message} onDone={toast.clear} />
    </Page>
  );
}

/** 다음 성장 단계까지 남은 걸음. 기준(1·3·5걸음)은 PRD FR-07 */
function StageProgress({ steps }: { steps: number }) {
  const marks = [0, 1, 3, 5];
  const nextMark = marks.find((m) => m > steps);
  if (nextMark === undefined) return <p className="sub" style={{ textAlign: 'left', marginTop: 6, fontSize: 12 }}>{copy.myPage.maxStage}</p>;
  const prevMark = [...marks].reverse().find((m) => m <= steps) ?? 0;
  const pct = ((steps - prevMark) / (nextMark - prevMark)) * 100;
  return (
    <>
      <div className="progress" role="progressbar" aria-valuemin={prevMark} aria-valuemax={nextMark} aria-valuenow={steps}>
        <span style={{ width: `${Math.max(pct, 6)}%` }} />
      </div>
      <p className="sub" style={{ textAlign: 'left', marginTop: 6, fontSize: 12 }}>{copy.myPage.nextStage(nextMark - steps, growthStage(nextMark))}</p>
    </>
  );
}

/** 완료 기록 상세: 저장된 결과 요약만 보여 준다. 원문·카드는 저장하지 않는다 */
export function ReflectionDetail() {
  const { reflectionId } = useParams();
  const toast = useToast();
  const [r, setR] = useState<ReflectionSummary | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const backToList = useBackToList();
  const id = Number(reflectionId);

  useEffect(() => {
    if (!Number.isInteger(id)) return;
    withUser(() => api.getReflection(id))
      .then(setR)
      .catch((e) => {
        toast.show(e instanceof ApiError ? e.message : copy.common.error);
        setTimeout(backToList, 1200);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function remove() {
    setConfirm(false);
    setBusy(true);
    try {
      await withUser(() => api.deleteReflection(id));
      backToList();
    } catch (e) {
      // 이미 지운 기록(404)도 목록으로 돌아간다. 걸음은 서버가 중복 차감하지 않는다
      if (e instanceof ApiError && e.code === 'NOT_FOUND') backToList();
      else toast.show(e instanceof ApiError ? e.message : copy.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title={copy.myPage.title}>
      {!r ? (
        <Spinner />
      ) : (
        <>
          <dl className="dl">
            <dt>완료한 때</dt>
            <dd>{formatDate(r.completedAt)}</dd>
            <dt>상황</dt>
            <dd>{situationName(r.situationType)}</dd>
            <dt>처음 마음 무게</dt>
            <dd>{r.initialWeight}</dd>
            <dt>{copy.myPage.recommendedVsSelected}</dt>
            <dd>{pathName(r.recommendedPath)} → {pathName(r.selectedPath)}</dd>
            <dt>{copy.myPage.q6}</dt>
            <dd>{r.moodReduced ? '응' : '아니'}</dd>
          </dl>
          <button type="button" className="secondary" onClick={() => setConfirm(true)} disabled={busy}>
            {busy ? copy.common.loading : copy.myPage.delete}
          </button>
        </>
      )}
      {confirm && (
        <Modal
          title={copy.myPage.deleteConfirm}
          actions={[
            { label: copy.myPage.deleteNo, onClick: () => setConfirm(false) },
            { label: copy.myPage.deleteYes, onClick: remove, kind: 'secondary' },
          ]}
        />
      )}
      <Toast message={toast.message} onDone={toast.clear} />
    </Page>
  );
}

/** 미루기 기록 창: 최신순 최대 5개. 원문·핵심 카드 내용은 보여 주지 않는다(PRD FR-11) */
export function Reminders() {
  const toast = useToast();
  const { begin, starting } = useStartSession();
  const [items, setItems] = useState<Reminder[] | null>(null);

  const load = useCallback(() => {
    withUser(() => api.listReminders())
      .then((r) => setItems(r.items))
      .catch((e) => toast.show(e instanceof ApiError ? e.message : copy.common.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  async function remove(reminderId: number) {
    try {
      await withUser(() => api.deleteReminder(reminderId));
      setItems((prev) => prev?.filter((x) => x.reminderId !== reminderId) ?? null);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NOT_FOUND') load();
      else toast.show(e instanceof ApiError ? e.message : copy.common.error);
    }
  }

  return (
    <Page title={copy.reminders.title} overlay>
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="empty">{copy.reminders.empty}</p>
      ) : (
        <>
          <div className="stack" style={{ gap: 12, marginTop: 8 }}>
            {items.map(({ reminderId, reflection: r }) => (
              <div key={reminderId} className="defer-item">
                <span className="when">{copy.reminders.daysAgo(daysAgo(r.completedAt))}</span>
                <span className="what">{copy.reminders.item(situationName(r.situationType), r.initialWeight)}</span>
                <span className="acts">
                  <button type="button" className="mini" onClick={() => remove(reminderId)}>{copy.reminders.delete}</button>
                  <button type="button" className="mini dark" disabled={starting} onClick={() => begin(toast.show, { situationType: r.situationType })}>
                    {starting ? copy.common.loading : copy.reminders.revisit}
                  </button>
                </span>
              </div>
            ))}
          </div>
          <p className="sub" style={{ marginTop: 16, fontSize: 12 }}>{copy.reminders.note}</p>
        </>
      )}
      <Toast message={toast.message} onDone={toast.clear} />
    </Page>
  );
}
