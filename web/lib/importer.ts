/**
 * 利用者リスト・訪問介護計画・職員・サービス提供記録の取り込み。
 * CSV / Excel のどちらでも読み、見出しの表記ゆれ・和暦・Excel日付に対応する。
 */
import { unitsOfCode } from "./billing";
import { fromMin } from "./format";
import { LEAVE_ITEMS, WEEKDAYS } from "./master";
import type { CarePlan, CareRecord, CareUser, PlanService, Staff, Weekday } from "./types";

export type Table = string[][];
export type Issue = { row: number; message: string };
export type ParseResult<T> = { rows: T[]; errors: Issue[]; warnings: Issue[]; unknownHeaders: string[] };

/* ---------- ファイル読込 ---------- */

export function parseCSV(text: string): Table {
  const src = text.replace(/^﻿/, "");
  const rows: Table = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Shift_JIS の CSV（Excelの既定保存）にも対応 */
export function decodeText(buf: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("shift_jis").decode(buf);
}

export async function readTable(file: File): Promise<Table> {
  const buf = await file.arrayBuffer();
  if (/\.xlsx$/i.test(file.name)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    const out: Table = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) vals.push(cellText(row.getCell(c).value));
      out.push(vals);
    });
    return out.filter((r) => r.some((c) => c.trim()));
  }
  if (/\.xls$/i.test(file.name)) throw new Error("古い形式（.xls）は読めません。Excelで .xlsx または CSV に保存し直してください。");
  return parseCSV(decodeText(buf));
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) {
    // Excel の時刻のみのセルは 1899-12-30 基準の日時になる
    if (v.getUTCFullYear() < 1901) return fromMin(v.getUTCHours() * 60 + v.getUTCMinutes());
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.text) return o.text;
    if ("result" in o) return cellText(o.result);
  }
  return String(v);
}

/* ---------- 値の変換 ---------- */

const z2h = (s: string) => s.replace(/[０-９Ａ-Ｚａ-ｚ：／－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/ー|−/g, "-");

const ERA: Record<string, number> = { 令和: 2018, R: 2018, 平成: 1988, H: 1988, 昭和: 1925, S: 1925, 大正: 1911, T: 1911 };

/** 2026/10/1, 2026-10-01, 2026年10月1日, 令和8年10月1日, R8.10.1, Excelシリアル値 → YYYY-MM-DD */
export function parseDateJP(raw: string): string | null {
  const s = z2h(raw.trim()).replace(/\s/g, "");
  if (!s) return null;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  let y: number, m: number, d: number;
  const era = s.match(/^(令和|平成|昭和|大正|[RHST])(\d{1,2}|元)[年./-](\d{1,2})[月./-](\d{1,2})日?$/i);
  const west = s.match(/^(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})日?$/);
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (era) {
    y = ERA[era[1].toUpperCase()] ?? ERA[era[1]];
    y += era[2] === "元" ? 1 : Number(era[2]);
    m = Number(era[3]);
    d = Number(era[4]);
  } else if (west) [y, m, d] = [Number(west[1]), Number(west[2]), Number(west[3])];
  else if (compact) [y, m, d] = [Number(compact[1]), Number(compact[2]), Number(compact[3])];
  else return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 9:00, 09:00, 9時00分, 900, Excel時刻(0.375) → HH:MM */
export function parseTime(raw: string): string | null {
  const s = z2h(raw.trim());
  if (!s) return null;
  if (/^0?\.\d+$/.test(s)) return fromMin(Math.round(Number(s) * 1440));
  const m = s.match(/^(\d{1,2})[:時](\d{1,2})分?$/) ?? s.match(/^(\d{1,2})(\d{2})$/) ?? s.match(/^(\d{1,2})時$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2] ?? 0);
  if (h > 23 || mi > 59) return null;
  return fromMin(h * 60 + mi);
}

const num = (s: string) => {
  const n = Number(z2h(s).replace(/[^\d.-]/g, ""));
  return s.trim() && Number.isFinite(n) ? n : null;
};
const list = (s: string) => s.split(/[・、,，/／\n]/).map((x) => x.trim()).filter(Boolean);
const yes = (s: string) => /^(済|はい|有|あり|○|〇|1|true|yes)$/i.test(s.trim());

/** 月 / 月・水・金 / 月水金 / 月〜金 / 平日 / 毎日 → 曜日の配列 */
export function parseWeekdays(raw: string): Weekday[] {
  const s = z2h(raw).replace(/\s/g, "").replace(/曜日?/g, "");
  if (s === "毎日") return ["月", "火", "水", "木", "金", "土", "日"];
  if (s === "平日") return ["月", "火", "水", "木", "金"];
  const order: Weekday[] = ["月", "火", "水", "木", "金", "土", "日"];
  const range = s.match(/^([月火水木金土日])[〜~\-－から]+([月火水木金土日])$/);
  if (range) {
    const a = order.indexOf(range[1] as Weekday);
    const b = order.indexOf(range[2] as Weekday);
    return a <= b ? order.slice(a, b + 1) : [];
  }
  if (!/^[月火水木金土日・、,，/]+$/.test(s)) return [];
  return [...new Set([...s].filter((c): c is Weekday => WEEKDAYS.includes(c as Weekday)))];
}

/** 区分の表記ゆれ（身体介護2 / 身体2 / 身1生1 / 生活援助3）をそろえる */
export function normalizeCode(raw: string): string {
  return z2h(raw)
    .replace(/\s/g, "")
    .replace(/身体介護|身体/g, "身体")
    .replace(/生活援助|生活/g, "生活")
    .replace(/^身(\d)/, "身体$1")
    .replace(/生(\d)$/, "生活$1")
    .replace(/^身体(\d)生活(\d)$/, "身体$1生活$2");
}

/* ---------- 見出しの対応表 ---------- */

type Field = { key: string; label: string; aliases: string[]; required?: boolean };

const norm = (s: string) => z2h(s).replace(/[\s()（）【】「」・:：*※]/g, "").toLowerCase();

function mapHeaders(header: string[], fields: Field[]) {
  const idx: Record<string, number> = {};
  const unknown: string[] = [];
  header.forEach((h, i) => {
    const n = norm(h);
    const f = fields.find((f) => [f.label, ...f.aliases].some((a) => norm(a) === n));
    if (f && idx[f.key] === undefined) idx[f.key] = i;
    else if (h.trim()) unknown.push(h);
  });
  return { idx, unknown };
}

function run<T>(table: Table, fields: Field[], build: (get: (k: string) => string, row: number, err: (m: string) => void, warn: (m: string) => void) => T | null): ParseResult<T> {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if (table.length < 2) return { rows: [], errors: [{ row: 0, message: "データ行がありません（1行目は見出し行にしてください）" }], warnings, unknownHeaders: [] };
  const { idx, unknown } = mapHeaders(table[0], fields);
  const missing = fields.filter((f) => f.required && idx[f.key] === undefined);
  if (missing.length) return { rows: [], errors: [{ row: 1, message: `必須の列がありません：${missing.map((f) => f.label).join("、")}` }], warnings, unknownHeaders: unknown };
  const rows: T[] = [];
  table.slice(1).forEach((cells, i) => {
    const rowNo = i + 2;
    const get = (k: string) => (idx[k] === undefined ? "" : (cells[idx[k]] ?? "").trim());
    let bad = false;
    const out = build(get, rowNo, (m) => { bad = true; errors.push({ row: rowNo, message: m }); }, (m) => warnings.push({ row: rowNo, message: m }));
    if (out && !bad) rows.push(out);
  });
  return { rows, errors, warnings, unknownHeaders: unknown };
}

function dateField(get: (k: string) => string, key: string, label: string, err: (m: string) => void, required = false): string {
  const v = get(key);
  if (!v) {
    if (required) err(`${label}がありません`);
    return "";
  }
  const d = parseDateJP(v);
  if (!d) err(`${label}「${v}」を日付として読めません`);
  return d ?? "";
}

/* ---------- 利用者リスト ---------- */

export const USER_FIELDS: Field[] = [
  { key: "id", label: "利用者ID", aliases: ["利用者番号", "利用者コード", "ID", "No"] },
  { key: "name", label: "氏名", aliases: ["利用者名", "利用者氏名", "名前"], required: true },
  { key: "kana", label: "フリガナ", aliases: ["ふりがな", "カナ", "氏名カナ"] },
  { key: "sex", label: "性別", aliases: [] },
  { key: "birthDate", label: "生年月日", aliases: ["誕生日"] },
  { key: "careLevel", label: "要介護度", aliases: ["介護度", "要介護状態区分"] },
  { key: "certFrom", label: "認定有効期間開始", aliases: ["認定開始日", "有効期間開始", "認定有効期間（開始）", "有効開始日"] },
  { key: "certTo", label: "認定有効期間終了", aliases: ["認定終了日", "有効期間終了", "認定有効期間（終了）", "有効終了日"] },
  { key: "insuredNo", label: "被保険者番号", aliases: ["被保番号", "被保険者No"] },
  { key: "insurerNo", label: "保険者番号", aliases: [] },
  { key: "burden", label: "負担割合", aliases: ["利用者負担割合"] },
  { key: "cmOffice", label: "居宅介護支援事業所", aliases: ["居宅介護支援事業者", "ケアマネ事業所", "支援事業所"] },
  { key: "careManager", label: "担当ケアマネ", aliases: ["担当介護支援専門員", "介護支援専門員", "ケアマネ", "ケアマネジャー"] },
  { key: "contractDate", label: "契約日", aliases: ["契約年月日", "重要事項説明日"] },
  { key: "note", label: "備考", aliases: ["特記", "メモ"] },
];

const CARE_LEVELS = ["要支援1", "要支援2", "要介護1", "要介護2", "要介護3", "要介護4", "要介護5", "事業対象者"];

export function parseUsers(table: Table): ParseResult<CareUser> {
  return run(table, USER_FIELDS, (get, _row, err, warn) => {
    const insuredNo = z2h(get("insuredNo"));
    const id = z2h(get("id")) || insuredNo;
    if (!id) err("利用者ID か 被保険者番号 のどちらかが必要です");
    const careLevel = z2h(get("careLevel")).replace(/\s/g, "").replace(/^介護(\d)$/, "要介護$1").replace(/^支援(\d)$/, "要支援$1");
    if (careLevel && !CARE_LEVELS.includes(careLevel)) warn(`要介護度「${careLevel}」は想定外の表記です`);
    const certFrom = dateField(get, "certFrom", "認定有効期間開始", err);
    const certTo = dateField(get, "certTo", "認定有効期間終了", err);
    if (!certFrom || !certTo) warn("認定有効期間が未入力です（運営指導チェックで指摘されます）");
    if (certFrom && certTo && certFrom > certTo) err("認定有効期間の開始が終了より後です");
    if (insuredNo && !/^\d{10}$/.test(insuredNo)) warn(`被保険者番号「${insuredNo}」が10桁の数字ではありません`);
    const sex = get("sex");
    return {
      id, name: get("name"), kana: get("kana"), sex: sex.startsWith("男") ? "男" : sex.startsWith("女") ? "女" : "",
      birthDate: dateField(get, "birthDate", "生年月日", err), careLevel, certFrom, certTo, insuredNo, insurerNo: z2h(get("insurerNo")),
      burden: get("burden"), cmOffice: get("cmOffice"), careManager: get("careManager"),
      contractDate: dateField(get, "contractDate", "契約日", err), note: get("note"),
    };
  });
}

/* ---------- 職員 ---------- */

export const STAFF_FIELDS: Field[] = [
  { key: "id", label: "職員ID", aliases: ["職員番号", "職員コード", "ID"] },
  { key: "name", label: "氏名", aliases: ["職員名", "名前", "ヘルパー名"], required: true },
  { key: "qualification", label: "資格", aliases: ["保有資格"], required: true },
  { key: "role", label: "職種", aliases: ["役職"] },
  { key: "employment", label: "雇用形態", aliases: ["勤務形態", "常勤非常勤"] },
  { key: "mon", label: "月", aliases: ["月曜", "月曜日"] },
  { key: "tue", label: "火", aliases: ["火曜", "火曜日"] },
  { key: "wed", label: "水", aliases: ["水曜", "水曜日"] },
  { key: "thu", label: "木", aliases: ["木曜", "木曜日"] },
  { key: "fri", label: "金", aliases: ["金曜", "金曜日"] },
  { key: "sat", label: "土", aliases: ["土曜", "土曜日"] },
  { key: "sun", label: "日", aliases: ["日曜", "日曜日"] },
  { key: "maxWeekly", label: "週の上限時間", aliases: ["週上限", "週の訪問上限", "上限時間週"] },
  { key: "ngUsers", label: "担当しない利用者", aliases: ["NG利用者", "担当不可"] },
  { key: "preferredUsers", label: "担当希望の利用者", aliases: ["担当利用者", "希望利用者", "固定担当"] },
];

const DAY_KEYS: [string, Weekday][] = [["mon", "月"], ["tue", "火"], ["wed", "水"], ["thu", "木"], ["fri", "金"], ["sat", "土"], ["sun", "日"]];

/** 勤務可能時間：9:00-17:00 / 9:00〜12:00,14:00〜18:00 / ○（終日=7:00〜20:00）/ ×・空欄（不可） */
export function parseRanges(raw: string): { from: string; to: string }[] | null {
  const s = z2h(raw.trim());
  if (!s || /^(×|✕|x|-|―|不可|休)$/i.test(s)) return [];
  if (/^(○|〇|◯|終日|可)$/.test(s)) return [{ from: "07:00", to: "20:00" }];
  const out: { from: string; to: string }[] = [];
  for (const part of s.split(/[,，、/／\s]+/).filter(Boolean)) {
    const m = part.split(/[〜~\-－]/);
    const from = m.length === 2 ? parseTime(m[0]) : null;
    const to = m.length === 2 ? parseTime(m[1]) : null;
    if (!from || !to || from >= to) return null;
    out.push({ from, to });
  }
  return out;
}

export function parseStaff(table: Table): ParseResult<Staff> {
  return run(table, STAFF_FIELDS, (get, row, err, warn) => {
    const q = get("qualification");
    const qualification = /介護福祉士/.test(q) ? "介護福祉士" : /実務者|基礎研修|ヘルパー1級|1級/.test(q) ? "実務者研修" : /初任者|ヘルパー2級|2級/.test(q) ? "初任者研修" : q;
    if (qualification !== q) warn(`資格「${q}」を「${qualification}」として扱います`);
    return {
      id: z2h(get("id")) || `S${String(row - 1).padStart(2, "0")}`,
      name: get("name"),
      qualification,
      role: /サ責|サービス提供責任者/.test(get("role")) ? "サービス提供責任者" : "訪問介護員",
      ...staffShiftFields(get, err),
    };
  });
}

function staffShiftFields(get: (k: string) => string, err: (m: string) => void): Partial<Staff> {
  const out: Partial<Staff> = {};
  const emp = get("employment");
  if (emp) out.employment = /非常勤|パート/.test(emp) ? "非常勤" : "常勤";
  if (DAY_KEYS.some(([k]) => get(k))) {
    const availability: NonNullable<Staff["availability"]> = {};
    for (const [k, w] of DAY_KEYS) {
      const r = parseRanges(get(k));
      if (r === null) err(`${w}曜の勤務可能時間「${get(k)}」を読めません（例：9:00-17:00 / ○ / ×）`);
      else if (r.length) availability[w] = r;
    }
    out.availability = availability;
  }
  const h = num(get("maxWeekly"));
  if (h) out.maxWeeklyMinutes = Math.round(h * 60);
  if (get("ngUsers")) out.ngUsers = list(get("ngUsers"));
  if (get("preferredUsers")) out.preferredUsers = list(get("preferredUsers"));
  return out;
}

/* ---------- 訪問介護計画（1行＝1サービス枠） ---------- */

export const PLAN_FIELDS: Field[] = [
  { key: "planId", label: "計画ID", aliases: ["計画番号"] },
  { key: "userId", label: "利用者ID", aliases: ["利用者番号", "利用者コード", "被保険者番号"] },
  { key: "userName", label: "利用者名", aliases: ["氏名", "利用者氏名"] },
  { key: "createdAt", label: "作成日", aliases: ["計画作成日", "作成年月日"], required: true },
  { key: "createdBy", label: "作成者", aliases: ["サービス提供責任者", "サ責", "計画作成者"] },
  { key: "carePlanDate", label: "ケアプラン作成日", aliases: ["居宅サービス計画作成日"] },
  { key: "agreedAt", label: "同意日", aliases: ["説明同意日", "説明・同意日"] },
  { key: "deliveredAt", label: "交付日", aliases: [] },
  { key: "periodFrom", label: "計画開始日", aliases: ["計画期間開始", "計画期間（開始）", "開始日"], required: true },
  { key: "periodTo", label: "計画終了日", aliases: ["計画期間終了", "計画期間（終了）", "終了日"], required: true },
  { key: "wish", label: "本人・家族の意向", aliases: ["意向", "本人家族の意向", "利用者及び家族の意向"] },
  { key: "longGoal", label: "長期目標", aliases: [] },
  { key: "shortGoal1", label: "短期目標1", aliases: ["短期目標"] },
  { key: "shortGoal2", label: "短期目標2", aliases: [] },
  { key: "shortGoal3", label: "短期目標3", aliases: [] },
  { key: "weekday", label: "曜日", aliases: ["提供曜日"], required: true },
  { key: "start", label: "開始時刻", aliases: ["開始時間", "提供開始"], required: true },
  { key: "minutes", label: "所要時間", aliases: ["所要時間分", "時間分", "提供時間"], required: true },
  { key: "code", label: "サービス区分", aliases: ["区分", "サービスコード区分", "サービス種類"], required: true },
  { key: "bodyMinutes", label: "身体介護時間", aliases: ["うち身体介護", "身体介護分"] },
  { key: "content", label: "サービス内容", aliases: ["援助内容", "具体的なサービス内容"] },
  { key: "caution", label: "留意事項", aliases: ["手順", "留意事項・手順"] },
];

const PLAN_LEVEL = ["planId", "userId", "userName", "createdAt", "createdBy", "carePlanDate", "agreedAt", "deliveredAt", "periodFrom", "periodTo", "wish", "longGoal", "shortGoal1", "shortGoal2", "shortGoal3"];

/**
 * 2行目以降のサービス枠で計画単位の項目が空欄のときは、直前の計画の値を引き継ぐ。
 * 計画ID・利用者ID・作成日のいずれかが入っていて直前と違う行は、新しい計画の始まりとみなす。
 */
function fillDownPlanRows(table: Table): Table {
  if (table.length < 2) return table;
  const { idx } = mapHeaders(table[0], PLAN_FIELDS);
  const keyCols = ["planId", "userId", "userName", "createdAt"].map((k) => idx[k]).filter((i) => i !== undefined);
  const levelCols = PLAN_LEVEL.map((k) => idx[k]).filter((i) => i !== undefined);
  let prev: string[] | null = null;
  return [table[0], ...table.slice(1).map((row) => {
    const r = [...row];
    const starts = !prev || keyCols.some((i) => (r[i] ?? "").trim() && (r[i] ?? "").trim() !== (prev![i] ?? "").trim());
    if (!starts && prev) for (const i of levelCols) if (!(r[i] ?? "").trim()) r[i] = prev[i] ?? "";
    prev = r;
    return r;
  })];
}

type PlanRow = { key: string; plan: Omit<CarePlan, "services">; services: PlanService[] };

/** 利用者IDがなく氏名だけのときは、取り込み済みの利用者から探す */
export function parsePlans(input: Table, users: CareUser[]): ParseResult<CarePlan> {
  const table = fillDownPlanRows(input);
  const res = run<PlanRow>(table, PLAN_FIELDS, (get, _row, err, warn) => {
    let userId = z2h(get("userId"));
    const byId = users.find((u) => u.id === userId || u.insuredNo === userId);
    if (byId) userId = byId.id;
    else if (!userId && get("userName")) {
      const hits = users.filter((u) => u.name.replace(/\s/g, "") === get("userName").replace(/\s/g, ""));
      if (hits.length === 1) userId = hits[0].id;
      else err(hits.length ? `利用者名「${get("userName")}」が複数います。利用者IDを入れてください` : `利用者「${get("userName")}」が利用者リストにありません`);
    }
    if (!userId) err("利用者ID または 利用者名 が必要です");
    else if (!users.some((u) => u.id === userId)) warn(`利用者ID「${userId}」が利用者リストにありません（先に利用者リストを取り込んでください）`);
    const createdAt = dateField(get, "createdAt", "作成日", err, true);
    const periodFrom = dateField(get, "periodFrom", "計画開始日", err, true);
    const periodTo = dateField(get, "periodTo", "計画終了日", err, true);
    if (periodFrom && periodTo && periodFrom > periodTo) err("計画開始日が終了日より後です");
    const weekdays = parseWeekdays(get("weekday"));
    if (weekdays.length === 0) err(`曜日「${get("weekday")}」を読めません（例：月 / 月・水・金）`);
    const start = parseTime(get("start"));
    if (!start) err(`開始時刻「${get("start")}」を読めません`);
    const minutes = num(get("minutes"));
    if (!minutes || minutes <= 0) err(`所要時間「${get("minutes")}」を読めません（分で入力）`);
    const code = normalizeCode(get("code"));
    if (unitsOfCode(code) === null) err(`サービス区分「${get("code")}」を読めません（例：身体2 / 身体1生活1 / 生活3）`);
    const bodyMinutes = num(get("bodyMinutes")) ?? undefined;
    if (code.startsWith("身体") && code.includes("生活") && bodyMinutes === undefined) warn("身体＋生活の区分ですが身体介護時間がありません");
    if (!get("content")) warn("サービス内容（具体的な援助内容）が未入力です");
    const key = z2h(get("planId")) || `${userId}|${createdAt}`;
    return {
      key,
      plan: {
        id: z2h(get("planId")) || `P-${userId}-${createdAt}`,
        userId, createdAt, createdBy: get("createdBy"), carePlanDate: dateField(get, "carePlanDate", "ケアプラン作成日", err),
        agreedAt: dateField(get, "agreedAt", "同意日", err), deliveredAt: dateField(get, "deliveredAt", "交付日", err),
        periodFrom, periodTo, wish: get("wish"), longGoal: get("longGoal"),
        shortGoals: [get("shortGoal1"), get("shortGoal2"), get("shortGoal3")].filter(Boolean),
      },
      services: weekdays.map((weekday) => ({ weekday, start: start ?? "", minutes: minutes ?? 0, code, bodyMinutes, content: get("content"), caution: get("caution") })),
    };
  });
  // 同じ計画の行をまとめる（計画単位の項目は最初に値が入っている行を採用）
  const grouped = new Map<string, CarePlan>();
  for (const r of res.rows) {
    const g = grouped.get(r.key);
    if (!g) grouped.set(r.key, { ...r.plan, services: [...r.services] });
    else {
      for (const k of Object.keys(r.plan) as (keyof typeof r.plan)[]) {
        const cur = g[k];
        if ((Array.isArray(cur) ? cur.length === 0 : !cur) && r.plan[k]) (g as Record<string, unknown>)[k] = r.plan[k];
      }
      g.services.push(...r.services);
    }
  }
  return { ...res, rows: [...grouped.values()] };
}

/* ---------- サービス提供記録 ---------- */

export const RECORD_FIELDS: Field[] = [
  { key: "no", label: "記録No", aliases: ["記録番号", "No"] },
  { key: "date", label: "提供日", aliases: ["サービス提供日", "日付", "訪問日"], required: true },
  { key: "userId", label: "利用者ID", aliases: ["利用者番号", "被保険者番号"] },
  { key: "userName", label: "利用者名", aliases: ["氏名"] },
  { key: "start", label: "開始", aliases: ["開始時刻", "開始時間"], required: true },
  { key: "end", label: "終了", aliases: ["終了時刻", "終了時間"], required: true },
  { key: "planCode", label: "計画区分", aliases: [] },
  { key: "billingCode", label: "算定区分", aliases: ["サービス区分", "区分"], required: true },
  { key: "bodyMinutes", label: "身体介護時間", aliases: ["うち身体介護"] },
  { key: "units", label: "単位数", aliases: ["単位"] },
  { key: "body", label: "身体介護", aliases: ["身体介護内容"] },
  { key: "life", label: "生活援助", aliases: ["生活援助内容"] },
  { key: "staff", label: "担当職員", aliases: ["担当ヘルパー", "ヘルパー", "職員ID", "訪問介護員"], required: true },
  { key: "temp", label: "体温", aliases: [] },
  { key: "bp", label: "血圧", aliases: [] },
  { key: "pulse", label: "脈拍", aliases: [] },
  { key: "condition", label: "顔色・様子", aliases: ["様子", "状態"] },
  { key: "meal", label: "食事摂取", aliases: ["食事"] },
  { key: "excretion", label: "排泄", aliases: [] },
  { key: "note", label: "特記事項", aliases: ["記録", "特記", "経過"] },
  { key: "reportTo", label: "報告先", aliases: ["報告・連絡"] },
  { key: "userConfirmed", label: "利用者確認", aliases: ["確認印", "サイン"] },
  { key: "supervisorCheckedAt", label: "サ責確認日時", aliases: ["サ責確認"] },
  { key: "supervisor", label: "サ責確認者", aliases: [] },
];

export function parseRecords(table: Table, users: CareUser[], staff: Staff[]): ParseResult<CareRecord> {
  let seq = 1;
  return run(table, RECORD_FIELDS, (get, _row, err, warn) => {
    const date = dateField(get, "date", "提供日", err, true);
    let userId = z2h(get("userId"));
    const u = users.find((x) => x.id === userId || x.insuredNo === userId) ?? (!userId ? users.find((x) => x.name.replace(/\s/g, "") === get("userName").replace(/\s/g, "")) : undefined);
    if (u) userId = u.id;
    if (!userId) err("利用者ID または 利用者名 が必要です");
    else if (!u) warn(`利用者「${userId}」が利用者リストにありません`);
    const start = parseTime(get("start"));
    const end = parseTime(get("end"));
    if (!start) err(`開始「${get("start")}」を読めません`);
    if (!end) err(`終了「${get("end")}」を読めません`);
    const [sh, sm] = (start ?? "0:0").split(":").map(Number);
    const [eh, em] = (end ?? "0:0").split(":").map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    if (start && end && minutes <= 0) err("終了が開始より前です");
    const billingCode = normalizeCode(get("billingCode"));
    const units = num(get("units")) ?? unitsOfCode(billingCode);
    if (units === null) err(`算定区分「${get("billingCode")}」を読めません`);
    const st = staff.find((s) => s.id === z2h(get("staff")) || s.name.replace(/\s/g, "") === get("staff").replace(/\s/g, ""));
    if (!st) warn(`担当職員「${get("staff")}」が職員名簿にありません`);
    const sv = staff.find((s) => s.id === get("supervisor") || s.name.replace(/\s/g, "") === get("supervisor").replace(/\s/g, ""));
    const svAtRaw = get("supervisorCheckedAt");
    const svAt = svAtRaw ? (parseDateJP(svAtRaw.split(/[ T]/)[0]) ?? "") + (svAtRaw.match(/\d{1,2}:\d{2}/) ? `T${parseTime(svAtRaw.match(/\d{1,2}:\d{2}/)![0])}` : "T00:00") : "";
    const reportTo = get("reportTo").replace(/^(なし|無|-|―)$/, "");
    return {
      no: get("no") || `I${String(seq++).padStart(5, "0")}`,
      date, userId, planCode: normalizeCode(get("planCode")) || billingCode, start: start ?? "", end: end ?? "", minutes,
      bodyMinutes: num(get("bodyMinutes")) ?? undefined, billingCode, units: units ?? 0,
      body: list(get("body")).filter((x) => x !== "―"), life: list(get("life")).filter((x) => x !== "―"),
      staffId: st?.id ?? get("staff"), helpers: 1,
      vitals: { temp: num(get("temp")), bp: get("bp"), pulse: num(get("pulse")) },
      condition: get("condition") || (reportTo ? "要観察" : "良好"), meal: get("meal") || "―", excretion: get("excretion") || "―",
      note: get("note"), reported: !!reportTo, reportTo, leaveCheck: [...LEAVE_ITEMS],
      userConfirmed: yes(get("userConfirmed")), confirmedAt: date && end ? `${date}T${end}` : "",
      supervisorCheckedBy: svAt ? (sv?.id ?? staff.find((s) => s.role === "サービス提供責任者")?.id ?? null) : null,
      supervisorCheckedAt: svAt || null, createdAt: date ? `${date}T${end ?? "00:00"}` : "", history: [],
    };
  });
}

/* ---------- テンプレート ---------- */

export const TEMPLATES: Record<"users" | "plans" | "staff" | "records", { title: string; fields: Field[]; sample: string[][] }> = {
  users: {
    title: "利用者リスト",
    fields: USER_FIELDS,
    sample: [["U001", "山田 花子", "ヤマダ ハナコ", "女", "昭和17年5月12日", "要介護2", "2026/4/1", "2027/3/31", "0000000001", "27XXXX", "1割", "いいかいご居宅介護支援", "担当A", "2025/4/1", "独居"]],
  },
  plans: {
    title: "訪問介護計画",
    fields: PLAN_FIELDS,
    sample: [
      ["P-U001-1", "U001", "山田 花子", "2026/9/22", "中村 真理", "2026/9/19", "2026/9/26", "2026/9/26", "2026/10/1", "2027/3/31", "自分でお風呂に入りたい", "在宅で清潔な生活を続けられる", "見守りで安全に入浴できる", "洗濯物干しを自分で行える", "", "月・金", "9:00", "60", "身体1生活1", "25", "入浴の見守り・一部介助、居室掃除・洗濯", "膝の痛み訴え時は足浴に変更"],
      ["P-U001-1", "U001", "山田 花子", "", "", "", "", "", "", "", "", "", "", "", "", "水", "9:00", "45", "身体2", "", "入浴の見守り・一部介助、服薬確認", "入浴前に体調確認"],
    ],
  },
  staff: {
    title: "職員",
    fields: STAFF_FIELDS,
    sample: [
      ["S01", "中村 真理", "介護福祉士", "サービス提供責任者", "常勤", "8:30-17:30", "8:30-17:30", "8:30-17:30", "8:30-17:30", "8:30-17:30", "×", "×", "20", "", ""],
      ["S02", "小林 恵", "初任者研修", "訪問介護員", "非常勤", "8:30-13:00", "×", "8:30-13:00", "×", "8:30-13:00", "9:00-13:00", "×", "12", "", "U001"],
    ],
  },
  records: {
    title: "サービス提供記録",
    fields: RECORD_FIELDS,
    sample: [["T0001", "2026/10/5", "U001", "山田 花子", "9:00", "10:00", "身体1生活1", "身体1生活1", "25", "", "入浴介助・更衣介助", "掃除・洗濯", "中村 真理", "36.4", "128/76", "72", "良好", "―", "―", "入浴前の体調確認問題なし。浴槽の出入りは手すり使用し見守り。", "", "済", "2026/10/6 9:30", "中村 真理"]],
  },
};

export function templateCSV(kind: keyof typeof TEMPLATES): string {
  const t = TEMPLATES[kind];
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  return "﻿" + [t.fields.map((f) => f.label), ...t.sample].map((r) => r.map(esc).join(",")).join("\r\n");
}
