export type Weekday = "日" | "月" | "火" | "水" | "木" | "金" | "土";

export type PlanItem = {
  weekday: Weekday;
  /** 計画上のサービス区分（例: 身体2 / 身体1生活1 / 生活3） */
  code: string;
  start: string; // HH:MM
  minutes: number;
};

export type CareUser = {
  id: string;
  name: string;
  kana: string;
  sex: "男" | "女";
  age: number;
  careLevel: string;
  insuredNo: string;
  careManager: string;
  plan: PlanItem[];
  note: string;
  /** 訪問介護計画の作成日・利用者同意日 */
  planCreated: string;
  planAgreed: string;
};

export type Staff = {
  id: string;
  name: string;
  qualification: string;
  role: "サービス提供責任者" | "訪問介護員";
};

export type Vitals = { temp: number; bp: string; pulse: number };

export type HistoryEntry = {
  at: string; // ISO 日時
  by: string; // 職員ID
  field: string;
  before: string;
  after: string;
  reason: string;
};

export type CareRecord = {
  no: string;
  date: string; // YYYY-MM-DD
  userId: string;
  planCode: string;
  start: string;
  end: string;
  minutes: number;
  /** 身体介護と生活援助を組み合わせた場合の身体介護部分の分数 */
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
