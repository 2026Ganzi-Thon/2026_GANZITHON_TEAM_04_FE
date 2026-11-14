import type { CanAct, CardCategory, PathType, SituationType } from '../api/types';

/**
 * 화면 문구. 피그마 최종본(229:1008) 문구는 그대로, [신규]는 피그마에 없어 새로 쓴 초안(팀 검수 필요). 말투: 반말.
 * 흐름의 데이터·정책은 PRD v2.0 / API 명세 기준.
 */
export const copy = {
  common: {
    helpNow: '지금 도움받기', // [신규]
    quit: '그만하기', // [신규]
    quitConfirm: '여기서 그만할까?\n지금까지 적은 생각과 카드는 지워져.', // [신규]
    quitYes: '그만할래',
    quitNo: '계속할래',
    back: '뒤로',
    loading: '잠깐만…',
    ok: '알겠어',
    error: '잠시 문제가 생겼어. 다시 해 줘.',
  },
  home: {
    headline1: '복잡한 생각을,',
    headline2Logo: '말랑',
    headline2Rest: '하게!',
    tapToStart: '탭 하여 시작하기!',
    notice: '말랑은 진단이나 치료를 하지 않는 마음 정리 도구야.', // [신규]
    reminders: (n: number) => `미뤄 둔 생각 ${n}개`, // 접근성 라벨
    myPage: '내 기록', // [신규]
  },
  situation: {
    question: '오늘 무슨 일 있었어?',
    options: { RELATIONSHIP: '연락·관계', STUDY_WORK: '공부·일', WAITING: '결과 기다림', OTHER: '그 밖에' } satisfies Record<SituationType, string>,
    weightLabel: '마음 무게',
    light: '가벼워',
    heavy: '무거워',
    cta: '시작하기',
  },
  concern: {
    prompt: '떠오르는 말, 그대로 적어 봐',
    placeholder: '친구가 연락을 읽었는데 답이 없어.\n어제 내가 한 말 때문에 화났나 봐.\n이제 멀어지려나 봐.',
    counter: (n: number) => `${n}/200`,
    cta: '카드 고르러가기',
    generating: '생각을 카드로 나누는 중…', // [신규]
    // [신규] PRD 4장·API 명세 8장: 외부 AI 전송 사실을 알린다.
    // TODO(출시 전): AI 제공자 이름·보관 설정 확인 후 문구 확정, 동의 절차가 필요한지 검토
    aiNotice: '적은 글은 생각 카드를 만들 때 AI 서비스로 보내져. 정리를 마치거나 그만두면 말랑에서 지워져.',
  },
  pick: {
    guessTitle: ['추측 카드', '를\n골라 봐'] as const,
    factTitle: ['사실 카드', '를\n골라 봐'] as const,
    guessHint: '내 생각이나 예상인 카드를 골라 줘', // [신규] PRD: ASSUMPTION = 내 생각이나 예상
    factHint: '직접 확인한 내용인 카드를 골라 줘', // [신규] PRD: FACT = 직접 확인한 내용
    add: '+카드 추가',
    addPlaceholder: '더하고 싶은 생각', // [신규]
    edit: '카드 고치기', // [신규] PRD: 카드 수정·삭제 지원
    editDone: '고치기 끝', // [신규]
    editHint: '고칠 카드를 눌러 줘', // [신규]
    save: '저장',
    cancel: '취소',
    remove: '지우기',
    lastCard: '카드는 한 장 이상 필요해요', // PRD 문구 그대로
    limit: '카드는 8장까지 만들 수 있어', // [신규]
    truncatedTitle: '생각이 많아서 앞의 8장만 카드로 만들었어', // [신규]
    truncatedBody: '빠진 내용이 있으면 카드를 고치거나 바꿔 적어 줘.', // [신규]
    cta: '완료',
  },
  sort: {
    title: '사실일까, 추측일까?',
    fact: '사실',
    guess: '추측',
    unsorted: '나누지 못한 카드',
    question: '확실히 알고 있는 내용이야?',
    yes: '응',
    no: '아니',
    cta: '다 나눴어',
  },
  short: { FACT: '사실', ASSUMPTION: '추측', UNCLASSIFIED: '미분류' } satisfies Record<CardCategory, string>,
  control: {
    q3: '제일 신경 쓰이는 건?',
    q4: '지금 할 수 있는 게 있어?',
    q4Options: { HAS_ACTION: '있어', NO_ACTION: '없어', UNKNOWN: '몰라' } satisfies Record<CanAct, string>,
    q5: '답을 알려면 시간이 필요해?',
    q5Options: { yes: '응', no: '아니' },
    cta: '길 보러 가기',
  },
  path: {
    title: '어떤 길로 갈래?',
    options: {
      ACTION: { title: '행동하기', desc: '작은 거 하나 해 보기' },
      SWITCH: { title: '전환하기', desc: '잠깐 숨 돌리기' },
      DEFER: { title: '미루기', desc: '나중에 다시 보기' },
    } satisfies Record<PathType, { title: string; desc: string }>,
    recommended: '추천',
    cta: '이 길로 갈래',
  },
  action: {
    title: '작은 거 하나\n골라 볼까?', // [신규] 피그마에 길별 활동 화면 없음
    custom: '직접 적기', // [신규]
    customPlaceholder: '내가 할 수 있는 작은 일', // [신규]
    skip: '건너뛰기', // [신규]
    cta: '해 볼게', // [신규]
  },
  switch: {
    title: '잠깐 숨\n돌려 볼까?', // [신규]
    pick: '하나 골라 봐', // [신규]
    cta: '해 봤어', // [신규]
  },
  defer: {
    title: '지금 답하지\n않아도 괜찮아', // [신규]
    body: '마치면 첫 화면 미루기 목록에 남겨 둘게.\n알림이나 날짜 예약은 없어. 생각난 때 다시 열어 봐.', // [신규] 사실대로 안내
    cta: '그렇게 할게', // [신규]
  },
  reflect: {
    bubble: '말랑이와 이야기 하니 어때?',
    q1: '이 생각, 계속 머릿속에 맴돌아?',
    q1Options: { yes: '응', some: '조금', no: '아니' },
    q2: '지금 다른 일로 넘어갈 수 있을 것 같아?',
    q2Options: { yes: '응', no: '아니', some: '조금' },
    cta: '완료',
    loading: '엉킨 털 푸는 중~',
  },
  result: {
    byPath: {
      ACTION: '작은 걸 해 본 것만으로\n충분히 잘했어', // [신규]
      SWITCH: '잠깐 쉬어 간 것도\n나를 돌본 선택이야', // [신규]
      DEFER: '기다리기로 한 것도\n용기 있는 선택이야',
    } satisfies Record<PathType, string>,
    compare: '마음 무게 처음 → 지금',
    nowLabel: { true: '가벼워졌어', false: '그대로야' }, // [신규] 숫자 대신(API는 줄었는지만 받음)
    stillHeavy: '아직 마음이 많이 힘들어.',
    cta: '마치기',
  },
  crisis: {
    title: '많이 힘들었지',
    subtitle: '지금은 이야기 들어 줄 사람과 먼저 만나자',
    helpTitle: '혼자 버티지 않아도 돼', // [신규] '지금 도움받기'로 들어왔을 때
    helpSubtitle: '이야기 들어 줄 사람이 24시간 기다리고 있어', // [신규]
    call: (contact: string) => `${contact} 전화하기`,
    callDesc: '마음이 힘들 때 · 24시간 · 무료',
    madlen: '마들랜 문자 상담',
    madlenDesc: '말로 하기 어려울 때 · 24시간 · SNS 상담',
    madlenPending: '연결 정보 확인 중', // [신규] TODO(출시 전): 확인된 연결 수단으로 교체
    emergency: '지금 바로 위험하다면 119나 112에 연락해 줘', // [신규] 전문가 검토 필요
    disclaimer: '말랑은 진단이나 치료를 하지 않아.', // PRD FR-08
    goBack: '돌아가서 다시 쓰기', // [신규] 위기 감지로 들어왔을 때
    back: '돌아가기', // [신규]
    home: '처음으로',
  },
  myPage: {
    title: '내 기록', // [신규]
    steps: (n: number) => `${n}걸음`,
    nextStage: (left: number, next: string) => `${left}걸음 더 가면 ${next}`, // [신규]
    maxStage: '가장 말랑한 단계야', // [신규]
    empty: '아직 마친 정리가 없어', // [신규]
    more: '더 보기',
    weight: (w: number) => `처음 마음 무게 ${w}`,
    recommendedVsSelected: '추천 → 고른 길',
    q6: '마음 무게가 줄었어?',
    delete: '기록 지우기',
    deleteConfirm: '이 기록을 지울까?\n한 걸음이 하나 줄고, 연결된 미루기도 함께 지워져.', // PRD FR-10
    deleteYes: '지울래',
    deleteNo: '그대로 둘래',
  },
  reminders: {
    title: '미뤄 둔 생각, 지금 다시 볼까?',
    empty: '아직 미뤄 둔 생각이 없어', // [신규]
    note: '최근 5개까지 남아. 지워도 내 기록과 걸음은 그대로야.', // [신규]
    // 피그마는 고민 문장을 보여 주지만 PRD·API는 원문을 저장하지 않는다 → 상황과 무게만 보여 준다
    item: (situation: string, weight: number) => `${situation} 고민 · 처음 마음 무게 ${weight}`,
    revisit: '다시 정리하기', // [신규]
    delete: '지우기',
    daysAgo: (d: number) => (d <= 0 ? '오늘' : `${d}일전`),
  },
} as const;
