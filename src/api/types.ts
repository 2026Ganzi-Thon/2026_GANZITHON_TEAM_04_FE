/** MALLANG_API_Spec.md 기준 타입. 서버 값(enum)은 대문자 문자열 그대로 쓴다. */

export type SituationType = 'RELATIONSHIP' | 'STUDY_WORK' | 'WAITING' | 'OTHER';
export type CardCategory = 'FACT' | 'ASSUMPTION' | 'UNCLASSIFIED';
export type PathType = 'ACTION' | 'SWITCH' | 'DEFER';
export type CanAct = 'HAS_ACTION' | 'NO_ACTION' | 'UNKNOWN';
export type Weight = 1 | 2 | 3 | 4 | 5;
export type GrowthStage = '엉킨 털' | '풀린 털' | '몽실 털' | '구름 같은 털';
export type GeneratedBy = 'AI' | 'RULE';

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'EMPTY_CONCERN'
  | 'CONCERN_TOO_LONG'
  | 'CARD_LIMIT_EXCEEDED'
  | 'EMPTY_CARD'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'LAST_CARD'
  | 'CARDS_ALREADY_EXIST'
  | 'INVALID_STATE'
  | 'ALREADY_COMPLETED'
  | 'SESSION_EXPIRED'
  | 'SAFETY_GUIDANCE_REQUIRED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'; // 프론트 전용: 서버에 닿지 못함

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Card {
  cardId: number;
  seq: number;
  content: string;
  category: CardCategory;
}

export interface ReflectionSummary {
  reflectionId: number;
  completedAt: string;
  situationType: SituationType;
  initialWeight: Weight;
  recommendedPath: PathType;
  selectedPath: PathType;
  moodReduced: boolean;
}

export interface SwitchActivity {
  id: 'BREATHE' | 'WATER' | 'STRETCH' | 'LOOK_AROUND' | 'WINDOW';
  title: string;
  guide: string;
}

export interface SafetyGuide {
  guideType: 'CRISIS';
  name: string;
  contact: string | null;
  url: string | null;
}

export interface Reminder {
  reminderId: number;
  reflection: ReflectionSummary;
}

export interface CompletionResult {
  reflection: ReflectionSummary;
  stepCount: number;
  growthStage: GrowthStage;
  showCounselingLink: boolean;
}

/** 프론트가 쓰는 API 전체. 실제 서버(http.ts)와 가짜 서버(mock.ts)가 같은 모양을 따른다. */
export interface MallangApi {
  // 사용자
  createUser(): Promise<{ userId: string; token: string }>;
  getUser(userId: string): Promise<{ userId: string; stepCount: number }>;
  // 세션·고민
  createSession(): Promise<{ sessionId: number; status: 'IN_PROGRESS' }>;
  putConcern(sessionId: number, body: { situationType: SituationType; initialWeight: Weight }): Promise<{ situationType: SituationType; initialWeight: Weight }>;
  putConcernText(sessionId: number, content: string): Promise<{ accepted: true }>;
  deleteSession(sessionId: number): Promise<null>;
  // 카드
  generateCards(concernId: number): Promise<{ cards: Card[]; generatedBy: GeneratedBy; truncated: boolean }>;
  getCards(concernId: number): Promise<{ cards: Card[] }>;
  addCard(concernId: number, content: string): Promise<{ card: Card }>;
  updateCard(cardId: number, content: string): Promise<{ card: Card; coreSelectionCleared: boolean }>;
  deleteCard(cardId: number): Promise<null>;
  classifyCards(concernId: number, items: { cardId: number; category: CardCategory }[]): Promise<{ cards: Card[] }>;
  // 경로
  recommendPath(concernId: number, body: { coreCardId: number; canAct: CanAct; needsTime: boolean }): Promise<{ recommendedPath: PathType; options: PathType[] }>;
  selectPath(concernId: number, selectedPath: PathType): Promise<{ selectedPath: PathType }>;
  actionRecommendations(sessionId: number): Promise<{ actions: string[]; generatedBy: GeneratedBy }>;
  switchActivities(): Promise<{ activities: SwitchActivity[] }>;
  // 완료·기록
  complete(concernId: number, moodReduced: boolean): Promise<CompletionResult>;
  mySummary(): Promise<{ stepCount: number; growthStage: GrowthStage }>;
  listReflections(page: number, size: number): Promise<{ items: ReflectionSummary[]; page: number; size: number; totalElements: number }>;
  getReflection(reflectionId: number): Promise<ReflectionSummary>;
  deleteReflection(reflectionId: number): Promise<null>;
  reminderStatus(): Promise<{ count: number; showNotification: boolean }>;
  listReminders(): Promise<{ items: Reminder[] }>;
  deleteReminder(reminderId: number): Promise<null>;
  // 안전
  safetyCheck(text: string): Promise<{ detected: boolean; guideType: 'CRISIS' | null }>;
  safetyGuides(): Promise<{ guides: SafetyGuide[] }>;
}
