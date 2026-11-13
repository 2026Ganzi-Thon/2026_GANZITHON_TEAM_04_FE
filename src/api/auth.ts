/**
 * 익명 토큰 보관. API 명세 1장: 토큰은 브라우저 localStorage. (진행 sessionId는 store/session.ts가 탭의 sessionStorage에 둔다)
 * 저장소 접근이 막힌 환경(사생활 보호 모드 등)에서도 앱이 멈추지 않게 try/catch로 감싼다.
 */
const TOKEN_KEY = 'mallang/token';
const USER_KEY = 'mallang/userId';

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}
function write(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    /* 저장 불가 환경: 메모리로만 진행 */
  }
}
const local = () => window.localStorage;

export const auth = {
  getToken: () => read(local, TOKEN_KEY),
  getUserId: () => read(local, USER_KEY),
  setUser(userId: string, token: string) {
    write(local, USER_KEY, userId);
    write(local, TOKEN_KEY, token);
  },
  clearUser() {
    write(local, USER_KEY, null);
    write(local, TOKEN_KEY, null);
  },
};
