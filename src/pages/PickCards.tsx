import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, withUser, type Card, type CardCategory } from '../api';
import { redirectFor, Screen, useApiError, useCards, useSaveClassification } from '../components/flow';
import { Mallangi } from '../components/Mallangi';
import { Modal, PrimaryButton, Spinner, Toast, useToast } from '../components/ui';
import { copy } from '../content/copy';
import { countGraphemes, isBlank, MAX_CARDS, MAX_CONCERN_CHARS, sliceGraphemes } from '../domain/text';
import { useSession } from '../store/session';

type Editing = { mode: 'edit'; card: Card; text: string } | { mode: 'add'; text: string } | null;

/**
 * 피그마 '추측카드 선택'(230:1970) · '사실카드 선택'(230:2059).
 * 추측 화면에서 고른 카드 = ASSUMPTION, 사실 화면에서 고른 카드 = FACT. 사실 화면에는 추측으로 고른 카드를 숨긴다.
 * 카드 추가·수정·삭제(PRD FR-02)는 '카드 고치기'로 들어간다.
 */
export default function PickCards({ mode }: { mode: 'guess' | 'fact' }) {
  const s = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const onError = useApiError();
  const saveClassification = useSaveClassification();
  const { cards, loading } = useCards(toast.show);
  const nav = (location.state ?? {}) as { truncated?: boolean };
  const [showTruncated, setShowTruncated] = useState(mode === 'guess' && !!nav.truncated);
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const redirect = redirectFor(s, mode === 'guess' ? 'pick-guess' : 'pick-fact');
  if (redirect) return <Navigate to={redirect} replace />;

  const target: CardCategory = mode === 'guess' ? 'ASSUMPTION' : 'FACT';
  const visible = mode === 'guess' ? cards : cards.filter((c) => s.picks[c.cardId] !== 'ASSUMPTION');
  const [boldWord, rest] = mode === 'guess' ? copy.pick.guessTitle : copy.pick.factTitle;

  function toggle(card: Card) {
    const picks = { ...s.picks };
    if (picks[card.cardId] === target) delete picks[card.cardId];
    else picks[card.cardId] = target;
    s.patch({ picks, classified: false });
  }

  function setText(v: string) {
    if (!editing) return;
    setEditing({ ...editing, text: countGraphemes(v) > MAX_CONCERN_CHARS ? sliceGraphemes(v, MAX_CONCERN_CHARS) : v });
  }

  async function save() {
    if (!editing || isBlank(editing.text) || !s.sessionId) return;
    const id = s.sessionId;
    setBusy(true);
    setMsg('');
    try {
      if (editing.mode === 'add') {
        const { card } = await withUser(() => api.addCard(id, editing.text));
        s.patch({ cards: [...cards, card], classified: false });
      } else {
        const { card, coreSelectionCleared } = await withUser(() => api.updateCard(editing.card.cardId, editing.text));
        const picks = { ...s.picks };
        if (card.content !== editing.card.content) delete picks[card.cardId]; // 내용이 바뀌면 서버가 미분류로 되돌린다
        s.patch({ cards: cards.map((c) => (c.cardId === card.cardId ? card : c)), picks, classified: false });
        if (coreSelectionCleared) s.invalidateFromCards();
      }
      setEditing(null);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'CARD_LIMIT_EXCEEDED' || e.code === 'EMPTY_CARD')) setMsg(e.message);
      else onError(e, toast.show);
    } finally {
      setBusy(false);
    }
  }

  async function remove(card: Card) {
    if (cards.length <= 1) {
      setMsg(copy.pick.lastCard);
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await withUser(() => api.deleteCard(card.cardId));
      const picks = { ...s.picks };
      delete picks[card.cardId];
      s.patch({ cards: cards.filter((c) => c.cardId !== card.cardId).map((c, i) => ({ ...c, seq: i + 1 })), picks, classified: false });
      if (s.coreCardId === card.cardId) s.invalidateFromCards();
      setEditing(null);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LAST_CARD') setMsg(copy.pick.lastCard);
      else onError(e, toast.show);
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    if (mode === 'guess') {
      navigate('/s/pick-fact');
      return;
    }
    const unsorted = cards.filter((c) => !s.picks[c.cardId]);
    if (unsorted.length > 0) {
      navigate('/s/sort');
      return;
    }
    // 나누지 못한 카드가 없으면 분류 화면을 건너뛴다
    setBusy(true);
    const ok = await saveClassification(toast.show);
    setBusy(false);
    if (ok) navigate('/s/control');
  }

  const editor = editing && (
    <div className="edit-box" style={{ gridColumn: '1 / -1' }}>
      <label className="sr-only" htmlFor="card-edit">
        {editing.mode === 'add' ? copy.pick.addPlaceholder : copy.pick.edit}
      </label>
      <textarea id="card-edit" autoFocus value={editing.text} placeholder={copy.pick.addPlaceholder} onChange={(e) => setText(e.target.value)} />
      <div className="edit-actions">
        {editing.mode === 'edit' && (
          <button type="button" className="mini danger" style={{ marginRight: 'auto' }} onClick={() => remove(editing.card)} disabled={busy}>
            {copy.pick.remove}
          </button>
        )}
        <button type="button" className="mini" onClick={() => { setEditing(null); setMsg(''); }} disabled={busy}>
          {copy.pick.cancel}
        </button>
        <button type="button" className="mini dark" onClick={save} disabled={busy || isBlank(editing.text)}>
          {copy.pick.save}
        </button>
      </div>
    </div>
  );

  return (
    <Screen
      step={3}
      back={mode === 'guess' ? '/s/concern' : '/s/pick-guess'}
      footer={
        <PrimaryButton onClick={next} busy={busy} disabled={loading || !!editing}>
          {copy.pick.cta}
        </PrimaryButton>
      }
    >
      <div className="head-row" style={{ gap: 4, marginLeft: -16 }}>
        <Mallangi variant="cards" width={165} still />
        <h1 className="big-title">
          <b>{boldWord}</b>
          {rest}
        </h1>
      </div>
      <p className="sub" style={{ marginBottom: 16 }}>{editMode ? copy.pick.editHint : mode === 'guess' ? copy.pick.guessHint : copy.pick.factHint}</p>
      {loading ? (
        <Spinner />
      ) : (
        <div className="card-grid" role={editMode ? undefined : 'group'} aria-label={boldWord}>
          {visible.map((c) =>
            editing?.mode === 'edit' && editing.card.cardId === c.cardId ? (
              <div key={c.cardId} style={{ display: 'contents' }}>{editor}</div>
            ) : editMode ? (
              <button key={c.cardId} type="button" className="tcard editing" onClick={() => { setMsg(''); setEditing({ mode: 'edit', card: c, text: c.content }); }} aria-label={`${c.content} 고치기`}>
                {c.content}
              </button>
            ) : (
              <button key={c.cardId} type="button" role="checkbox" aria-checked={s.picks[c.cardId] === target} className="tcard" onClick={() => toggle(c)}>
                {c.content}
              </button>
            ),
          )}
          {editing?.mode === 'add'
            ? editor
            : cards.length < MAX_CARDS && (
                <button type="button" className="tcard add" onClick={() => { setMsg(''); setEditing({ mode: 'add', text: '' }); }}>
                  {copy.pick.add}
                </button>
              )}
        </div>
      )}
      <button type="button" className="edit-toggle" onClick={() => { setEditMode(!editMode); setEditing(null); setMsg(''); }}>
        {editMode ? copy.pick.editDone : copy.pick.edit}
      </button>
      <p className="inline-msg" role="alert">
        {msg || (cards.length >= MAX_CARDS ? copy.pick.limit : '')}
      </p>
      {showTruncated && (
        <Modal
          title={copy.pick.truncatedTitle}
          body={copy.pick.truncatedBody}
          actions={[
            {
              label: copy.common.ok,
              onClick: () => {
                setShowTruncated(false);
                // 한 번만 보여 준다: 새로고침·뒤로 가기로 다시 들어와도 뜨지 않게 기록을 지운다
                navigate(location.pathname, { replace: true, state: null });
              },
            },
          ]}
        />
      )}
      <Toast message={toast.message} onDone={toast.clear} />
    </Screen>
  );
}
