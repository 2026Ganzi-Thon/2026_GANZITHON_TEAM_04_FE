import { auth } from './auth';
import { ApiError, type ErrorCode, type MallangApi } from './types';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * 실제 백엔드 호출. 응답 형식 {success, data} / {success:false, error:{code,message}}.
 * 사용자가 쓴 글은 오류 메시지·콘솔에 남기지 않는다.
 */
export function createHttpApi(baseUrl: string): MallangApi {
  const root = baseUrl.replace(/\/$/, '') + '/api/v1';

  async function call<T>(method: Method, path: string, body?: unknown, withAuth = true): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (withAuth) {
      const token = auth.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    let res: Response;
    try {
      res = await fetch(root + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError('NETWORK_ERROR', '연결이 불안정해. 잠시 후 다시 해 줘.', 0);
    }
    let json: { success?: boolean; data?: T; error?: { code?: ErrorCode; message?: string } } | null = null;
    try {
      json = await res.json();
    } catch {
      /* 본문 없음 */
    }
    if (res.ok && json?.success) return json.data as T;
    const code = json?.error?.code ?? (res.status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR');
    throw new ApiError(code, json?.error?.message ?? '잠시 문제가 생겼어. 다시 해 줘.', res.status);
  }

  return {
    createUser: () => call('POST', '/users', {}, false),
    getUser: (userId) => call('GET', `/users/${userId}`),
    createSession: () => call('POST', '/sessions', {}),
    putConcern: (id, body) => call('PUT', `/sessions/${id}/concern`, body),
    putConcernText: (id, content) => call('PUT', `/sessions/${id}/concern/text`, { content }),
    deleteSession: (id) => call('DELETE', `/sessions/${id}`),
    generateCards: (id) => call('POST', `/concerns/${id}/cards/generate`, {}),
    getCards: (id) => call('GET', `/concerns/${id}/cards`),
    addCard: (id, content) => call('POST', `/concerns/${id}/cards`, { content }),
    updateCard: (cardId, content) => call('PATCH', `/cards/${cardId}`, { content }),
    deleteCard: (cardId) => call('DELETE', `/cards/${cardId}`),
    classifyCards: (id, items) => call('PUT', `/concerns/${id}/cards/classification`, { items }),
    recommendPath: (id, body) => call('POST', `/concerns/${id}/path/recommendation`, body),
    selectPath: (id, selectedPath) => call('PUT', `/concerns/${id}/path/selection`, { selectedPath }),
    actionRecommendations: (id) => call('POST', `/sessions/${id}/action-recommendations`, {}),
    switchActivities: () => call('GET', '/path/actions?path=SWITCH'),
    complete: (id, moodReduced) => call('POST', `/concerns/${id}/completion`, { moodReduced }),
    mySummary: () => call('GET', '/me/summary'),
    listReflections: (page, size) => call('GET', `/reflections?page=${page}&size=${size}`),
    getReflection: (id) => call('GET', `/reflections/${id}`),
    deleteReflection: (id) => call('DELETE', `/reflections/${id}`),
    reminderStatus: () => call('GET', '/reminders/status'),
    listReminders: () => call('GET', '/reminders'),
    deleteReminder: (id) => call('DELETE', `/reminders/${id}`),
    safetyCheck: (text) => call('POST', '/safety/check', { text }),
    safetyGuides: () => call('GET', '/safety/guides', undefined, false),
  };
}
