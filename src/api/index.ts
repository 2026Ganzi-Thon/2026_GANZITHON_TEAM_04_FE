import { auth } from './auth';
import { createHttpApi } from './http';
import { createMockApi } from './mock';
import { ApiError, type MallangApi } from './types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

/** VITE_API_BASE_URL이 있으면 실제 서버, 없으면 브라우저 안의 가짜 API */
export const api: MallangApi = baseUrl ? createHttpApi(baseUrl) : createMockApi();
export const usingMock = !baseUrl;

let pending: Promise<void> | null = null;

/** 토큰이 없으면 익명 사용자를 발급한다. 이미 있으면 재발급하지 않는다(API 명세 2장). */
export function ensureUser(): Promise<void> {
  if (auth.getToken()) return Promise.resolve();
  pending ??= api
    .createUser()
    .then(({ userId, token }) => auth.setUser(userId, token))
    .finally(() => {
      pending = null;
    });
  return pending;
}

/**
 * 인증이 필요한 호출을 감싼다. 토큰이 무효(401)면 새 익명 사용자로 한 번만 다시 시도한다.
 * 이전 기록은 자동 복구되지 않는다(명세 그대로).
 */
export async function withUser<T>(fn: () => Promise<T>): Promise<T> {
  await ensureUser();
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.code === 'UNAUTHORIZED') {
      auth.clearUser();
      await ensureUser();
      return fn();
    }
    throw e;
  }
}

export { ApiError } from './types';
export type * from './types';
