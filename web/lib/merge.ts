import type { CarePlan, CareRecord, CareUser, ImportLog, Staff } from "./types";

export type ImportKind = "users" | "plans" | "staff" | "records";
export type Rows = { users: CareUser[]; plans: CarePlan[]; staff: Staff[]; records: CareRecord[] };

const KEY_OF: { [K in ImportKind]: (x: Rows[K][number]) => string } = {
  users: (x) => x.id,
  plans: (x) => x.id,
  staff: (x) => x.id,
  records: (x) => x.no,
};

/** 同じ訪問かどうか（記録Noが違っても、利用者・提供日・開始時刻が同じなら同じ訪問） */
export const visitKey = (r: CareRecord) => `${r.userId}|${r.date}|${r.start}`;

/** 取り込んだ行を登録済みの行に合わせる */
export function mergeRows<K extends ImportKind>(kind: K, current: Rows[K], rows: Rows[K], mode: ImportLog["mode"]): Rows[K] {
  if (mode === "置き換え") return kind === "records" ? (sortRecords(rows as CareRecord[]) as Rows[K]) : rows;
  const key = KEY_OF[kind] as (x: unknown) => string;
  const keys = new Set(rows.map(key));
  const visits = kind === "records" ? new Set((rows as CareRecord[]).map(visitKey)) : new Set<string>();
  const kept = (current as unknown[]).filter((x) => !keys.has(key(x)) && !(kind === "records" && visits.has(visitKey(x as CareRecord))));
  const merged = [...kept, ...rows];
  return (kind === "records" ? sortRecords(merged as CareRecord[]) : merged) as Rows[K];
}

/** 提供記録は提供日・開始時刻の順に並べる */
export function sortRecords(rs: CareRecord[]): CareRecord[] {
  return [...rs].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.userId.localeCompare(b.userId));
}

/** 取り込み前の確認用：新規と上書きの件数 */
export function countChanges<K extends ImportKind>(kind: K, current: Rows[K], rows: Rows[K]): { added: number; updated: number } {
  const key = KEY_OF[kind] as (x: unknown) => string;
  const keys = new Set((current as unknown[]).map(key));
  const visits = kind === "records" ? new Set((current as CareRecord[]).map(visitKey)) : new Set<string>();
  const updated = (rows as unknown[]).filter((x) => keys.has(key(x)) || (kind === "records" && visits.has(visitKey(x as CareRecord)))).length;
  return { added: rows.length - updated, updated };
}
