/**
 * 개발·시연용 가짜 API. 백엔드 주소(VITE_API_BASE_URL)가 없을 때 쓴다.
 * API 명세의 규칙(검증·오류 코드·삭제·걸음·미루기 5개 제한)을 브라우저 안에서 흉내 낸다.
 * 데이터는 localStorage 'mallang/mock-db/v1'에 저장되어 새로고침해도 유지된다.
 * AI는 없으므로 카드 생성은 규칙 분리(generatedBy=RULE), 행동 추천은 기본 행동 3개를 돌려준다.
 */
import { detectCrisis } from '../domain/crisis';
import { growthStage } from '../domain/growth';
import { recommendPath } from '../domain/recommend';
import { countGraphemes, isBlank, MAX_CARDS, MAX_CONCERN_CHARS, splitThoughts } from '../domain/text';
import { auth } from './auth';
import {
  ApiError,
  type CanAct,
  type Card,
  type CardCategory,
  type ErrorCode,
  type MallangApi,
  type PathType,
  type ReflectionSummary,
  type SituationType,
  type SwitchActivity,
  type Weight,
} from './types';

const DB_KEY = 'mallang/mock-db/v1';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_REMINDERS = 5;

interface MockSession {
  id: number;
  userId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED' | 'EXPIRED';
  lastActivityAt: number;
  situationType?: SituationType;
  initialWeight?: Weight;
  content?: string;
  cards: Card[];
  coreCardId?: number;
  canAct?: CanAct;
  needsTime?: boolean;
  recommendedPath?: PathType;
  selectedPath?: PathType;
}
interface MockDb {
  seq: number;
  users: { userId: string; token: string; steps: number }[];
  sessions: MockSession[];
  reflections: (ReflectionSummary & { userId: string; sessionId: number })[];
  reminders: { reminderId: number; userId: string; reflectionId: number; createdAt: number }[];
}

const SITUATIONS: SituationType[] = ['RELATIONSHIP', 'STUDY_WORK', 'WAITING', 'OTHER'];
const CATEGORIES: CardCategory[] = ['FACT', 'ASSUMPTION', 'UNCLASSIFIED'];
const PATHS: PathType[] = ['ACTION', 'SWITCH', 'DEFER'];
const CAN_ACT: CanAct[] = ['HAS_ACTION', 'NO_ACTION', 'UNKNOWN'];

/** 기능명세 4장 기본 행동(AI 장애 시) */
const DEFAULT_ACTIONS = ['지금 할 수 있는 작은 일을 하나 적어 보기', '잠시 쉬고 다시 살펴보기', '믿을 만한 사람에게 이야기해 보기'];

/** 기능명세 4장 전환 활동 */
const SWITCH_ACTIVITIES: SwitchActivity[] = [
  { id: 'BREATHE', title: '천천히 숨 쉬기', guide: '편안한 속도로 숨을 들이쉬고 내쉬어 보세요.' },
  { id: 'WATER', title: '물 한 잔 마시기', guide: '마실 수 있다면 물을 조금 마셔 보세요.' },
  { id: 'STRETCH', title: '몸 가볍게 움직이기', guide: '편안한 범위에서 어깨나 몸을 움직여 보세요.' },
  { id: 'LOOK_AROUND', title: '주변 살펴보기', guide: '지금 보이는 것 세 가지를 천천히 살펴보세요.' },
  { id: 'WINDOW', title: '창밖 보기', guide: '잠시 주변이나 창밖을 바라보세요.' },
];

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  INVALID_INPUT: '입력값을 확인해 주세요.',
  EMPTY_CONCERN: '고민을 적어 주세요.',
  CONCERN_TOO_LONG: '200자까지 적을 수 있어요.',
  CARD_LIMIT_EXCEEDED: '카드는 8장까지 만들 수 있어요.',
  EMPTY_CARD: '빈 카드는 만들 수 없어요.',
  UNAUTHORIZED: '다시 시작해 주세요.',
  FORBIDDEN: '볼 수 없는 기록이에요.',
  NOT_FOUND: '찾을 수 없어요.',
  LAST_CARD: '카드는 한 장 이상 필요해요',
  CARDS_ALREADY_EXIST: '이미 카드가 있어요.',
  INVALID_STATE: '순서가 맞지 않아요. 앞 단계부터 다시 해 주세요.',
  ALREADY_COMPLETED: '이미 마친 정리예요.',
  SESSION_EXPIRED: '시간이 오래 지나 정리가 끝났어요. 처음부터 다시 해 주세요.',
  SAFETY_GUIDANCE_REQUIRED: '상담 안내가 먼저 필요해요.',
};
const STATUS: Partial<Record<ErrorCode, number>> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  LAST_CARD: 409,
  CARDS_ALREADY_EXIST: 409,
  INVALID_STATE: 409,
  ALREADY_COMPLETED: 409,
  SESSION_EXPIRED: 409,
  SAFETY_GUIDANCE_REQUIRED: 409,
};
const fail = (code: ErrorCode): never => {
  throw new ApiError(code, MESSAGES[code] ?? '잠시 문제가 생겼어요.', STATUS[code] ?? 400);
};

function emptyDb(): MockDb {
  return { seq: 1, users: [], sessions: [], reflections: [], reminders: [] };
}
function load(): MockDb {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    return raw ? (JSON.parse(raw) as MockDb) : emptyDb();
  } catch {
    return emptyDb();
  }
}
let memoryDb: MockDb | null = null;
function save(db: MockDb) {
  memoryDb = db;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* 저장 불가 환경은 메모리만 사용 */
  }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
let delayMs = 250;
/** 테스트에서 응답 지연을 없앨 때 쓴다 */
export function setMockDelay(ms: number) {
  delayMs = ms;
}
const wait = () => (delayMs > 0 ? new Promise((r) => setTimeout(r, delayMs + Math.random() * delayMs)) : Promise.resolve());

/** 한 요청을 처리: 로드 → 작업 → 저장 → 복제해서 반환. 실패하면 저장하지 않는다(원자성 흉내). */
async function tx<T>(fn: (db: MockDb) => T): Promise<T> {
  await wait();
  const db = memoryDb ? clone(memoryDb) : load();
  const result = fn(db);
  save(db);
  return clone(result);
}

function currentUser(db: MockDb) {
  const token = auth.getToken();
  const user = token ? db.users.find((u) => u.token === token) : undefined;
  if (!user) return fail('UNAUTHORIZED');
  return user;
}

function wipe(s: MockSession) {
  delete s.content;
  s.cards = [];
  delete s.coreCardId;
  delete s.canAct;
  delete s.needsTime;
  delete s.recommendedPath;
}

/** 진행 중 세션 소유·만료 확인. 성공하면 마지막 활동 시각을 갱신한다. */
function activeSession(db: MockDb, id: number): MockSession {
  const user = currentUser(db);
  const s = db.sessions.find((x) => x.id === id);
  if (!s) return fail('NOT_FOUND');
  if (s.userId !== user.userId) return fail('FORBIDDEN');
  if (s.status === 'IN_PROGRESS' && Date.now() - s.lastActivityAt > SESSION_TTL_MS) {
    s.status = 'EXPIRED';
    wipe(s);
  }
  if (s.status === 'EXPIRED') return fail('SESSION_EXPIRED');
  if (s.status === 'COMPLETED') return fail('ALREADY_COMPLETED');
  if (s.status !== 'IN_PROGRESS') return fail('NOT_FOUND');
  s.lastActivityAt = Date.now();
  return s;
}

function cardOwner(db: MockDb, cardId: number) {
  const user = currentUser(db);
  const s = db.sessions.find((x) => x.cards.some((c) => c.cardId === cardId));
  if (!s) return fail('NOT_FOUND');
  if (s.userId !== user.userId) return fail('FORBIDDEN');
  const session = activeSession(db, s.id);
  return { session, card: session.cards.find((c) => c.cardId === cardId)! };
}

function checkCardText(content: unknown): string {
  if (typeof content !== 'string') return fail('INVALID_INPUT');
  if (isBlank(content)) return fail('EMPTY_CARD');
  if (countGraphemes(content) > MAX_CONCERN_CHARS) return fail('INVALID_INPUT');
  if (detectCrisis(content)) return fail('SAFETY_GUIDANCE_REQUIRED');
  return content.trim();
}

const resequence = (cards: Card[]) => cards.forEach((c, i) => (c.seq = i + 1));

function ownReflection(db: MockDb, reflectionId: number) {
  const user = currentUser(db);
  const r = db.reflections.find((x) => x.reflectionId === reflectionId);
  if (!r) return fail('NOT_FOUND');
  if (r.userId !== user.userId) return fail('FORBIDDEN');
  return { user, r };
}
const publicSummary = ({ userId: _u, sessionId: _s, ...rest }: MockDb['reflections'][number]): ReflectionSummary => rest;

export function createMockApi(): MallangApi {
  return {
    createUser: () =>
      tx((db) => {
        const userId = crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        db.users.push({ userId, token, steps: 0 });
        return { userId, token };
      }),

    getUser: (userId) =>
      tx((db) => {
        const user = currentUser(db);
        if (user.userId !== userId) return fail('FORBIDDEN');
        return { userId, stepCount: user.steps };
      }),

    createSession: () =>
      tx((db) => {
        const user = currentUser(db);
        const id = db.seq++;
        db.sessions.push({ id, userId: user.userId, status: 'IN_PROGRESS', lastActivityAt: Date.now(), cards: [] });
        return { sessionId: id, status: 'IN_PROGRESS' as const };
      }),

    putConcern: (id, body) =>
      tx((db) => {
        const s = activeSession(db, id);
        if (!SITUATIONS.includes(body.situationType) || ![1, 2, 3, 4, 5].includes(body.initialWeight)) fail('INVALID_INPUT');
        s.situationType = body.situationType;
        s.initialWeight = body.initialWeight;
        return { situationType: s.situationType, initialWeight: s.initialWeight };
      }),

    putConcernText: (id, content) =>
      tx((db) => {
        const s = activeSession(db, id);
        if (typeof content !== 'string' || isBlank(content)) return fail('EMPTY_CONCERN');
        if (countGraphemes(content) > MAX_CONCERN_CHARS) return fail('CONCERN_TOO_LONG');
        if (detectCrisis(content)) return fail('SAFETY_GUIDANCE_REQUIRED'); // 저장하지 않음
        if (s.content !== content) {
          wipe(s); // 고민을 다시 수정하면 카드·핵심·추천·경로 초기화
          delete s.selectedPath;
          s.content = content;
        }
        return { accepted: true as const };
      }),

    deleteSession: (id) =>
      tx((db) => {
        const user = currentUser(db);
        const s = db.sessions.find((x) => x.id === id);
        if (!s || s.status !== 'IN_PROGRESS') return fail('NOT_FOUND');
        if (s.userId !== user.userId) return fail('FORBIDDEN');
        s.status = 'ABORTED';
        wipe(s);
        return null;
      }),

    generateCards: (id) =>
      tx((db) => {
        const s = activeSession(db, id);
        if (!s.content) return fail('INVALID_STATE');
        if (s.cards.length > 0) return fail('CARDS_ALREADY_EXIST');
        const parts = splitThoughts(s.content);
        const all = parts.length > 0 ? parts : [s.content.trim()];
        const truncated = all.length > MAX_CARDS;
        s.cards = all.slice(0, MAX_CARDS).map((content, i) => ({ cardId: db.seq++, seq: i + 1, content, category: 'UNCLASSIFIED' as const }));
        return { cards: s.cards, generatedBy: 'RULE' as const, truncated };
      }),

    getCards: (id) => tx((db) => ({ cards: activeSession(db, id).cards })),

    addCard: (id, content) =>
      tx((db) => {
        const s = activeSession(db, id);
        const text = checkCardText(content);
        if (s.cards.length >= MAX_CARDS) return fail('CARD_LIMIT_EXCEEDED');
        const card: Card = { cardId: db.seq++, seq: s.cards.length + 1, content: text, category: 'UNCLASSIFIED' };
        s.cards.push(card);
        return { card };
      }),

    updateCard: (cardId, content) =>
      tx((db) => {
        const { session, card } = cardOwner(db, cardId);
        const text = checkCardText(content);
        let coreSelectionCleared = false;
        if (text !== card.content) {
          card.content = text;
          card.category = 'UNCLASSIFIED';
          if (session.coreCardId === cardId) {
            delete session.coreCardId;
            coreSelectionCleared = true;
          }
        }
        return { card, coreSelectionCleared };
      }),

    deleteCard: (cardId) =>
      tx((db) => {
        const { session } = cardOwner(db, cardId);
        if (session.cards.length <= 1) return fail('LAST_CARD');
        session.cards = session.cards.filter((c) => c.cardId !== cardId);
        resequence(session.cards);
        if (session.coreCardId === cardId) delete session.coreCardId;
        return null;
      }),

    classifyCards: (id, items) =>
      tx((db) => {
        const s = activeSession(db, id);
        if (!Array.isArray(items)) return fail('INVALID_INPUT');
        for (const it of items) {
          const card = s.cards.find((c) => c.cardId === it.cardId);
          if (!card || !CATEGORIES.includes(it.category)) return fail('INVALID_INPUT');
        }
        for (const it of items) s.cards.find((c) => c.cardId === it.cardId)!.category = it.category;
        return { cards: s.cards };
      }),

    recommendPath: (id, body) =>
      tx((db) => {
        const s = activeSession(db, id);
        if (!s.cards.some((c) => c.cardId === body.coreCardId)) return fail('INVALID_INPUT');
        if (!CAN_ACT.includes(body.canAct) || typeof body.needsTime !== 'boolean') return fail('INVALID_INPUT');
        if (!s.initialWeight) return fail('INVALID_STATE');
        s.coreCardId = body.coreCardId;
        s.canAct = body.canAct;
        s.needsTime = body.needsTime;
        s.recommendedPath = recommendPath(body.canAct, body.needsTime, s.initialWeight);
        return { recommendedPath: s.recommendedPath, options: [...PATHS] };
      }),

    selectPath: (id, selectedPath) =>
      tx((db) => {
        const s = activeSession(db, id);
        if (!PATHS.includes(selectedPath)) return fail('INVALID_INPUT');
        if (!s.recommendedPath) return fail('INVALID_STATE');
        s.selectedPath = selectedPath;
        return { selectedPath };
      }),

    actionRecommendations: (id) =>
      tx((db) => {
        const s = activeSession(db, id);
        if (s.selectedPath !== 'ACTION') return fail('INVALID_STATE');
        const core = s.cards.find((c) => c.cardId === s.coreCardId);
        if (core && detectCrisis(core.content)) return fail('SAFETY_GUIDANCE_REQUIRED');
        return { actions: [...DEFAULT_ACTIONS], generatedBy: 'RULE' as const };
      }),

    switchActivities: () =>
      tx((db) => {
        currentUser(db);
        const pool = [...SWITCH_ACTIVITIES];
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return { activities: pool.slice(0, 3) };
      }),

    complete: (id, moodReduced) =>
      tx((db) => {
        const s = activeSession(db, id);
        const user = currentUser(db);
        if (typeof moodReduced !== 'boolean') return fail('INVALID_INPUT');
        if (!s.selectedPath || !s.recommendedPath || !s.situationType || !s.initialWeight) return fail('INVALID_STATE');
        const reflection = {
          reflectionId: db.seq++,
          completedAt: new Date().toISOString(),
          situationType: s.situationType,
          initialWeight: s.initialWeight,
          recommendedPath: s.recommendedPath,
          selectedPath: s.selectedPath,
          moodReduced,
          userId: user.userId,
          sessionId: s.id,
        };
        db.reflections.push(reflection);
        user.steps += 1;
        if (s.selectedPath === 'DEFER') {
          db.reminders.push({ reminderId: db.seq++, userId: user.userId, reflectionId: reflection.reflectionId, createdAt: Date.now() });
          const mine = db.reminders.filter((r) => r.userId === user.userId).sort((a, b) => a.createdAt - b.createdAt);
          const overflow = mine.slice(0, Math.max(0, mine.length - MAX_REMINDERS)).map((r) => r.reminderId);
          db.reminders = db.reminders.filter((r) => !overflow.includes(r.reminderId));
        }
        s.status = 'COMPLETED';
        wipe(s);
        return {
          reflection: publicSummary(reflection),
          stepCount: user.steps,
          growthStage: growthStage(user.steps),
          showCounselingLink: !moodReduced,
        };
      }),

    mySummary: () =>
      tx((db) => {
        const user = currentUser(db);
        return { stepCount: user.steps, growthStage: growthStage(user.steps) };
      }),

    listReflections: (page, size) =>
      tx((db) => {
        const user = currentUser(db);
        if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 50) return fail('INVALID_INPUT');
        const mine = db.reflections.filter((r) => r.userId === user.userId).sort((a, b) => b.reflectionId - a.reflectionId);
        return { items: mine.slice(page * size, page * size + size).map(publicSummary), page, size, totalElements: mine.length };
      }),

    getReflection: (reflectionId) => tx((db) => publicSummary(ownReflection(db, reflectionId).r)),

    deleteReflection: (reflectionId) =>
      tx((db) => {
        const { user } = ownReflection(db, reflectionId);
        db.reflections = db.reflections.filter((r) => r.reflectionId !== reflectionId);
        db.reminders = db.reminders.filter((r) => r.reflectionId !== reflectionId);
        user.steps = Math.max(0, user.steps - 1);
        return null;
      }),

    reminderStatus: () =>
      tx((db) => {
        const user = currentUser(db);
        const count = db.reminders.filter((r) => r.userId === user.userId).length;
        return { count, showNotification: count > 0 };
      }),

    listReminders: () =>
      tx((db) => {
        const user = currentUser(db);
        const items = db.reminders
          .filter((r) => r.userId === user.userId)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, MAX_REMINDERS)
          .map((r) => ({ reminderId: r.reminderId, reflection: publicSummary(db.reflections.find((x) => x.reflectionId === r.reflectionId)!) }));
        return { items };
      }),

    deleteReminder: (reminderId) =>
      tx((db) => {
        const user = currentUser(db);
        const r = db.reminders.find((x) => x.reminderId === reminderId);
        if (!r) return fail('NOT_FOUND');
        if (r.userId !== user.userId) return fail('FORBIDDEN');
        db.reminders = db.reminders.filter((x) => x.reminderId !== reminderId);
        return null;
      }),

    safetyCheck: (text) =>
      tx((db) => {
        currentUser(db);
        const detected = detectCrisis(text);
        return { detected, guideType: detected ? ('CRISIS' as const) : null };
      }),

    safetyGuides: () =>
      tx(() => ({
        // TODO(출시 전): 마들랜 등 실제 연결 정보·운영시간·URL 확인 후 서버에 등록. 미확인 URL은 채우지 않는다.
        guides: [{ guideType: 'CRISIS' as const, name: '자살예방상담전화', contact: '109', url: null }],
      })),
  };
}

/** 테스트에서 가짜 DB를 비울 때 쓴다. */
export function resetMockDb() {
  memoryDb = null;
  try {
    window.localStorage.removeItem(DB_KEY);
  } catch {
    /* noop */
  }
}
