# 말랑 웹 프론트엔드

PRD v2.0 · 기능명세 · API 명세(`/api/v1`) 기준의 React + Vite + TypeScript 웹앱. 백엔드는 이 폴더에 없다.

> 이어서 작업한다면 먼저 [HANDOFF-FRONT.md](HANDOFF-FRONT.md)를 읽는다. 남은 일·결정 대기 항목·피그마와 다르게 한 이유가 있다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 테스트 45개 (도메인: 추천표 30조합·글자 수·대체 분리·위기 감지·성장·Q6 환산 / 가짜 API: 200자·8장·마지막 카드·완료 1회·미루기 5개·기록 삭제·소유권)
npm run build
```

- `VITE_API_BASE_URL`을 비워 두면 브라우저 안의 **가짜 API**(`src/api/mock.ts`)로 동작한다. 화면 왼쪽 아래에 `가짜 API` 표시가 뜬다.
- 실제 백엔드에 붙일 때는 `.env.example`을 `.env`로 복사하고 주소를 넣는다. 백엔드는 CORS로 이 주소를 허용해야 한다.

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/api/types.ts` | API 명세의 enum·응답 타입, `MallangApi` 인터페이스 |
| `src/api/http.ts` | 실제 서버 호출 (`{success,data}` 응답, 오류 코드 → `ApiError`) |
| `src/api/mock.ts` | 명세 규칙을 흉내 낸 가짜 서버 (localStorage `mallang/mock-db/v1`) |
| `src/api/auth.ts`, `index.ts` | 익명 토큰(localStorage) 발급·보관, 401이면 새 익명 사용자로 1회 재시도 |
| `src/store/session.ts` | 진행 상태. 탭 sessionStorage에 두어 새로고침은 이어짐. 원문·카드 내용은 저장 안 함 |
| `src/domain/` | 추천 규칙, 그래핌 글자 수, 대체 분리, 위기 감지 초안, 성장 단계 |
| `src/content/copy.ts` | 화면 문구. `[신규]`는 피그마에 없는 초안 |
| `src/styles.css` | 디자인 토큰(CSS 변수) + 스타일 |
| `src/pages/` | 화면 |

## 화면 흐름 (피그마 최종본 '전체 화면' 229:1008 기준, 데이터는 API 명세 기준)

`/` 메인 → `/s/situation` 상황·처음 무게 → `/s/concern` 고민 입력 → `/s/pick-guess` 추측 카드 고르기 → `/s/pick-fact` 사실 카드 고르기 → `/s/sort` 나누지 못한 카드(확실히 알고 있는 내용이야?) → `/s/control` 핵심 카드·Q4·Q5 → `/s/path` 길 선택(추천 표시) → `/s/activity` 길별 활동 → `/s/reflect` 말랑이와 이야기 하니 어때?(두 질문) → 로딩 → `/s/result` 결과

그 밖에 `/crisis` 상담 안내, `/me` 마이페이지, `/me/:id` 기록 상세, `/reminders` 미루기 기록 창.

피그마와 API가 다른 곳은 API에 맞췄다.
- 카드 고르기 결과는 API 분류(FACT/ASSUMPTION/UNCLASSIFIED)로 저장. 다 나누지 않아도 넘어갈 수 있다.
- 핵심 카드(Q3)는 전체 카드에서 고른다(추측 카드를 앞에 둠).
- 두 질문(응·조금·아니)은 `domain/reflect.ts` 규칙으로 Q6 `moodReduced` 하나로 바꿔 보낸다.
- 결과의 '지금' 무게는 숫자 대신 '가벼워졌어/그대로야'로 보여 준다(API는 숫자를 받지 않음).
- 미루기 기록은 고민 문장 대신 상황·처음 무게를 보여 준다(원문 저장 안 함).
- 카드 수정·삭제와 길별 활동 화면은 피그마에 없지만 PRD 기능이라 같은 스타일로 남겼다.
- 말랑이 그림은 `public/mallang/`에 있다. 파일이 없으면 크림색 자리표시가 나온다.

- 모든 세션 화면에 `지금 도움받기`와 `그만하기`(세션 삭제 후 메인)가 있다.
- 서버가 `409 SAFETY_GUIDANCE_REQUIRED`를 주면 어느 화면이든 상담 안내로 간다. 세션은 유지되어 돌아가서 다시 쓸 수 있다.
- 결과 화면에서는 브라우저 뒤로 가기로 앞 단계에 갈 수 없다(진입 가드가 결과로 되돌림).

## 출시 전 확인 (TODO)

- 마들랜 실제 연결 수단·운영 정보 → 서버 `GET /safety/guides`로 받기. 지금은 109만 연결하고 마들랜은 "확인 중"으로 표시한다.
- 119/112 안내 문구, 위기 감지 사전은 전문가 검토 필요 (프론트의 `crisis.ts`는 가짜 API 전용 초안이다).
- 몽실 털·구름 같은 털 단계 전용 말랑이 그림(지금은 풀린 털 그림을 같이 씀).
- Q6 두 질문 → `moodReduced` 환산 규칙 확정(`domain/reflect.ts`).
- `[신규]` 문구 검수.
- 새로고침하면 고민 입력창의 글은 비워진다(원문을 브라우저에 저장하지 않기 위해).
