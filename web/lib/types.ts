export type Weekday = "日" | "月" | "火" | "水" | "木" | "金" | "土";

/** 利用者（利用者リストから取り込む） */
export type CareUser = {
  id: string;
  name: string;
  kana: string;
  sex: "男" | "女" | "";
  birthDate: string; // YYYY-MM-DD（不明なら空）
  careLevel: string;
  /** 要介護認定の有効期間 */
  certFrom: string;
  certTo: string;
  insuredNo: string;
  insurerNo: string;
  burden: string; // 負担割合（1割など）
  cmOffice: string; // 居宅介護支援事業所
  careManager: string; // 担当介護支援専門員
  contractDate: string; // 契約日（重要事項説明・同意）
  /** 区分支給限度基準額（単位/月） */
  limitUnits?: number;
  note: string;
};

/** 訪問介護計画のサービス枠（曜日・時間・区分ごと） */
export type PlanService = {
  weekday: Weekday;
  start: string; // HH:MM
  minutes: number;
  /** サービス区分（例: 身体2 / 身体1生活1 / 生活3） */
  code: string;
  /** 身体介護と生活援助を組み合わせる場合の身体介護部分の分数 */
  bodyMinutes?: number;
  /** サービス内容（具体的な援助内容） */
  content: string;
  /** 留意事項・手順 */
  caution: string;
};

/** 訪問介護計画（後から取り込む） */
export type CarePlan = {
  id: string;
  userId: string;
  createdAt: string; // 作成日
  createdBy: string; // 作成者（サ責）
  carePlanDate: string; // 居宅サービス計画（ケアプラン）の作成日
  agreedAt: string; // 説明・同意日
  deliveredAt: string; // 交付日
  periodFrom: string; // 計画期間
  periodTo: string;
  wish: string; // 本人・家族の意向
  longGoal: string;
  shortGoals: string[];
  services: PlanService[];
};

export type TimeRange = { from: string; to: string }; // HH:MM

export type Staff = {
  id: string;
  name: string;
  qualification: string;
  role: "サービス提供責任者" | "訪問介護員";
  /** 以下はシフト作成用（未設定なら制約なしとして扱う） */
  employment?: "常勤" | "非常勤";
  /** 曜日ごとの勤務可能時間。曜日がない＝その曜日は勤務不可 */
  availability?: Partial<Record<Weekday, TimeRange[]>>;
  maxWeeklyMinutes?: number;
  /** 担当しない利用者（ID または氏名） */
  ngUsers?: string[];
  /** 担当を希望する・継続したい利用者（ID または氏名） */
  preferredUsers?: string[];
};

export type Vitals = { temp: number | null; bp: string; pulse: number | null };

export type HistoryEntry = {
  at: string; // ISO 日時
  by: string; // 職員ID または氏名
  field: string;
  before: string;
  after: string;
  reason: string;
};

/** サービス提供記録（テレッサ）1件 */
export type CareRecord = {
  no: string;
  date: string; // YYYY-MM-DD
  userId: string;
  planCode: string;
  start: string;
  end: string;
  minutes: number;
  bodyMinutes?: number;
  /** 記録に記載された算定区分 */
  billingCode: string;
  units: number;
  body: string[];
  life: string[];
  staffId: string;
  helpers: number;
  vitals: Vitals;
  condition: string;
  meal: string;
  excretion: string;
  note: string;
  reported: boolean;
  reportTo: string;
  leaveCheck: string[];
  userConfirmed: boolean;
  confirmedAt: string;
  supervisorCheckedBy: string | null;
  supervisorCheckedAt: string | null;
  createdAt: string;
  history: HistoryEntry[];
};

export type GoalRating = "達成" | "一部達成" | "未達成" | "継続";

/** 介護報告書（ケアマネへの月次サービス実施状況報告） */
export type CareReport = {
  id: string; // `${userId}-${YYYY-MM}`
  userId: string;
  month: string; // YYYY-MM
  planId: string;
  goalEvaluations: { goal: string; rating: GoalRating; comment: string }[];
  serviceSummary: string; // 実施状況（計画との差異の説明）
  condition: string; // 心身の状況・変化
  issues: string; // 課題
  policy: string; // 今後の方針
  planChange: "不要" | "要検討" | "必要";
  author: string; // 作成者（サ責）
  createdAt: string;
  status: "下書き" | "確定";
  finalizedAt: string | null;
  sentTo: string;
  sentAt: string | null;
  history: HistoryEntry[];
};

/** 書類の自己点検（運営指導の事前準備） */
export type SelfCheckEntry = { status: "済" | "一部" | "未" | ""; note: string; updatedAt: string };

export type ImportLog = { at: string; kind: string; fileName: string; rows: number; mode: "追加・更新" | "置き換え" };

/** 1回の訪問予定（計画から展開したもの） */
export type Visit = {
  key: string; // `${date}|${userId}|${start}`
  date: string;
  userId: string;
  start: string;
  end: string;
  minutes: number;
  code: string;
  planId: string;
  content: string;
  caution: string;
};

export type ShiftAssignment = { staffId: string | null; locked: boolean };

/** 月ごとのシフト（訪問の担当割り当て） */
export type ShiftPlan = {
  month: string; // YYYY-MM
  assignments: Record<string, ShiftAssignment>;
  bufferMinutes: number; // 訪問と訪問の間に空ける移動時間
  generatedAt: string;
  updatedAt: string;
};

export type Office = { corp: string; name: string; officeNo: string };

export type Dataset = {
  source: "mock" | "imported";
  office: Office;
  period: { from: string; to: string };
  users: CareUser[];
  plans: CarePlan[];
  staff: Staff[];
  records: CareRecord[];
  reports: CareReport[];
  shifts: ShiftPlan[];
  selfCheck: Record<string, SelfCheckEntry>;
  importLogs: ImportLog[];
};
