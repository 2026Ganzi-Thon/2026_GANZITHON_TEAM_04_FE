import { beforeEach, describe, expect, test } from 'vitest';
import { auth } from '../auth';
import { createMockApi, resetMockDb, setMockDelay } from '../mock';
import { ApiError, type ErrorCode, type MallangApi } from '../types';

// 브라우저 저장소 흉내
const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
(globalThis as unknown as { window: unknown }).window = { localStorage: storage, sessionStorage: storage };

let api: MallangApi;

async function code(p: Promise<unknown>): Promise<ErrorCode | 'OK'> {
  try {
    await p;
    return 'OK';
  } catch (e) {
    if (e instanceof ApiError) return e.code;
    throw e;
  }
}

async function newUser() {
  const { userId, token } = await api.createUser();
  auth.setUser(userId, token);
  return userId;
}

/** 고민 입력·카드 생성까지 */
async function sessionWithText(text: string, weight: 1 | 2 | 3 | 4 | 5 = 3) {
  const { sessionId } = await api.createSession();
  await api.putConcern(sessionId, { situationType: 'RELATIONSHIP', initialWeight: weight });
  await api.putConcernText(sessionId, text);
  return sessionId;
}

/** 처음부터 완료까지 한 번 */
async function completeOnce(path: 'ACTION' | 'SWITCH' | 'DEFER', moodReduced = true) {
  const id = await sessionWithText('답이 없어. 화났나 봐.');
  const { cards } = await api.generateCards(id);
  await api.recommendPath(id, { coreCardId: cards[0].cardId, canAct: 'NO_ACTION', needsTime: true });
  await api.selectPath(id, path);
  return { id, result: await api.complete(id, moodReduced) };
}

beforeEach(async () => {
  mem.clear();
  resetMockDb();
  setMockDelay(0);
  api = createMockApi();
  await newUser();
});

describe('고민 입력', () => {
  test('빈 글·200자 초과·위기 문구', async () => {
    const { sessionId } = await api.createSession();
    expect(await code(api.putConcernText(sessionId, '   '))).toBe('EMPTY_CONCERN');
    expect(await code(api.putConcernText(sessionId, '가'.repeat(201)))).toBe('CONCERN_TOO_LONG');
    expect(await code(api.putConcernText(sessionId, '가'.repeat(200)))).toBe('OK');
    expect(await code(api.putConcernText(sessionId, '그냥 죽고 싶어'))).toBe('SAFETY_GUIDANCE_REQUIRED');
  });
});

describe('카드', () => {
  test('9장 이상이면 앞 8장 + truncated', async () => {
    const id = await sessionWithText(Array.from({ length: 10 }, (_, i) => `생각 ${i + 1}.`).join(' '));
    const r = await api.generateCards(id);
    expect(r.cards).toHaveLength(8);
    expect(r.truncated).toBe(true);
    expect(r.cards[0].content).toBe('생각 1');
    expect(await code(api.generateCards(id))).toBe('CARDS_ALREADY_EXIST');
  });

  test('나눌 수 없으면 원문 한 장', async () => {
    const id = await sessionWithText('답이 없어 화났나 봐');
    expect((await api.generateCards(id)).cards.map((c) => c.content)).toEqual(['답이 없어 화났나 봐']);
  });

  test('8장 넘게 추가 불가, 빈 카드·위기 카드 불가', async () => {
    const id = await sessionWithText(Array.from({ length: 7 }, (_, i) => `생각 ${i + 1}.`).join(' '));
    await api.generateCards(id);
    expect(await code(api.addCard(id, '  '))).toBe('EMPTY_CARD');
    expect(await code(api.addCard(id, '살 이유가 없어'))).toBe('SAFETY_GUIDANCE_REQUIRED');
    expect(await code(api.addCard(id, '여덟 번째'))).toBe('OK');
    expect(await code(api.addCard(id, '아홉 번째'))).toBe('CARD_LIMIT_EXCEEDED');
  });

  test('마지막 카드는 지울 수 없다', async () => {
    const id = await sessionWithText('하나. 둘.');
    const { cards } = await api.generateCards(id);
    expect(await code(api.deleteCard(cards[0].cardId))).toBe('OK');
    expect(await code(api.deleteCard(cards[1].cardId))).toBe('LAST_CARD');
    expect((await api.getCards(id)).cards[0].seq).toBe(1);
  });

  test('내용을 바꾸면 미분류, 핵심 카드면 핵심 해제', async () => {
    const id = await sessionWithText('하나. 둘.');
    const { cards } = await api.generateCards(id);
    await api.classifyCards(id, [{ cardId: cards[0].cardId, category: 'FACT' }]);
    await api.recommendPath(id, { coreCardId: cards[0].cardId, canAct: 'HAS_ACTION', needsTime: false });
    const same = await api.updateCard(cards[0].cardId, '하나');
    expect(same.card.category).toBe('FACT');
    const changed = await api.updateCard(cards[0].cardId, '하나 바뀜');
    expect(changed.card.category).toBe('UNCLASSIFIED');
    expect(changed.coreSelectionCleared).toBe(true);
  });
});

describe('완료·걸음·미루기', () => {
  test('완료는 한 번만, 걸음 1 적립', async () => {
    const { id, result } = await completeOnce('ACTION');
    expect(result.stepCount).toBe(1);
    expect(result.growthStage).toBe('풀린 털');
    expect(await code(api.complete(id, true))).toBe('ALREADY_COMPLETED');
    expect((await api.mySummary()).stepCount).toBe(1);
  });

  test('줄지 않았으면 상담 링크', async () => {
    expect((await completeOnce('SWITCH', false)).result.showCounselingLink).toBe(true);
    expect((await completeOnce('SWITCH', true)).result.showCounselingLink).toBe(false);
  });

  test('중단한 세션은 기록·걸음 없음', async () => {
    const id = await sessionWithText('하나.');
    await api.deleteSession(id);
    expect((await api.mySummary()).stepCount).toBe(0);
    expect(await code(api.getCards(id))).toBe('NOT_FOUND');
  });

  test('미루기는 최대 5개, 6번째에 가장 오래된 것만 삭제, 걸음은 그대로', async () => {
    const ids: number[] = [];
    for (let i = 0; i < 6; i++) {
      ids.push((await completeOnce('DEFER')).result.reflection.reflectionId);
      await new Promise((r) => setTimeout(r, 2)); // 생성 시각 구분
    }
    const { items } = await api.listReminders();
    expect(items).toHaveLength(5);
    expect(items.map((x) => x.reflection.reflectionId)).not.toContain(ids[0]);
    expect((await api.mySummary()).stepCount).toBe(6);
    expect((await api.listReflections(0, 20)).totalElements).toBe(6);
  });

  test('미루기만 지우면 기록·걸음 유지', async () => {
    await completeOnce('DEFER');
    const { items } = await api.listReminders();
    await api.deleteReminder(items[0].reminderId);
    expect((await api.reminderStatus()).showNotification).toBe(false);
    expect((await api.mySummary()).stepCount).toBe(1);
  });

  test('기록을 지우면 연결 미루기 삭제·걸음 1 차감, 다시 지우면 404', async () => {
    const { result } = await completeOnce('DEFER');
    const rid = result.reflection.reflectionId;
    await api.deleteReflection(rid);
    expect((await api.mySummary()).stepCount).toBe(0);
    expect((await api.reminderStatus()).count).toBe(0);
    expect(await code(api.deleteReflection(rid))).toBe('NOT_FOUND');
    expect((await api.mySummary()).stepCount).toBe(0);
  });

  test('완료 기록에는 원문·카드가 없다', async () => {
    const { result } = await completeOnce('ACTION');
    expect(Object.keys(result.reflection).sort()).toEqual(
      ['completedAt', 'initialWeight', 'moodReduced', 'recommendedPath', 'reflectionId', 'selectedPath', 'situationType'].sort(),
    );
  });
});

describe('소유권', () => {
  test('다른 사용자의 기록·세션은 403', async () => {
    const { id, result } = await completeOnce('ACTION');
    const other = await sessionWithText('하나.');
    await newUser();
    expect(await code(api.getReflection(result.reflection.reflectionId))).toBe('FORBIDDEN');
    expect(await code(api.getCards(other))).toBe('FORBIDDEN');
    expect(id).toBeGreaterThan(0);
  });
});
