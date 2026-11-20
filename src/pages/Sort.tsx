import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { redirectFor, Screen, useCards, useSaveClassification } from '../components/flow';
import { GrowthMallangi } from '../components/GrowthMallangi';
import { PrimaryButton, Spinner, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';
import { useSession } from '../store/session';

/**
 * 피그마 '카드 나눔'(230:2108). 나누지 못한 카드를 하나씩 보여 주고 '확실히 알고 있는 내용이야?'로 나눈다.
 * 다 나누지 않아도 '다 나눴어'로 넘어갈 수 있다(남은 카드는 미분류, PRD FR-03).
 */
export default function Sort() {
  const s = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const saveClassification = useSaveClassification();
  const { cards, loading } = useCards(toast.show);
  const [busy, setBusy] = useState(false);
  const askRef = useRef<HTMLDivElement>(null);

  const facts = cards.filter((c) => s.picks[c.cardId] === 'FACT');
  const guesses = cards.filter((c) => s.picks[c.cardId] === 'ASSUMPTION');
  const unsorted = cards.filter((c) => !s.picks[c.cardId]);
  const current = unsorted[0];

  // 작은 화면에서 질문이 아래 버튼에 가려지지 않게, 다음 카드로 넘어갈 때마다 질문을 화면 안으로 끌어온다
  useEffect(() => {
    askRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current?.cardId]);

  const redirect = redirectFor(s, 'sort');
  if (redirect) return <Navigate to={redirect} replace />;

  function answer(known: boolean) {
    if (!current) return;
    s.patch({ picks: { ...s.picks, [current.cardId]: known ? 'FACT' : 'ASSUMPTION' }, classified: false });
  }

  async function done() {
    setBusy(true);
    const ok = await saveClassification(toast.show);
    setBusy(false);
    if (ok) navigate('/s/control');
  }

  return (
    <Screen step={3} back="/s/pick-fact" footer={<PrimaryButton onClick={done} busy={busy} disabled={loading}>{copy.sort.cta}</PrimaryButton>}>
      <h1 className="title" style={{ marginTop: 4 }}>{copy.sort.title}</h1>
      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="baskets">
            <section className="basket" aria-label={copy.sort.fact}>
              <h2>{copy.sort.fact}</h2>
              {facts.map((c) => <span key={c.cardId} className="chip">{c.content}</span>)}
            </section>
            <section className="basket" aria-label={copy.sort.guess}>
              <h2>{copy.sort.guess}</h2>
              {guesses.map((c) => <span key={c.cardId} className="chip">{c.content}</span>)}
            </section>
          </div>
          <section className="unsorted" aria-label={copy.sort.unsorted}>
            <h2>{copy.sort.unsorted}</h2>
            {unsorted.map((c) => (
              <span key={c.cardId} className={`chip${c === current ? ' current' : ''}`}>{c.content}</span>
            ))}
          </section>
          {current && (
            <div className="ask-row" ref={askRef}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <GrowthMallangi width={80} still />
                <span aria-hidden="true" style={{ position: 'absolute', top: -10, right: -5, fontSize: 28, fontWeight: 800, lineHeight: 1, color: 'var(--title)', transform: 'rotate(15deg)', pointerEvents: 'none' }}>?</span>
              </div>
              <div style={{ flex: 1 }}>
                <p className="q" id="sort-q">{copy.sort.question}</p>
                <div className="yn" role="group" aria-labelledby="sort-q">
                  <button type="button" className="choice" onClick={() => answer(true)}>{copy.sort.yes}</button>
                  <button type="button" className="choice" onClick={() => answer(false)}>{copy.sort.no}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}
