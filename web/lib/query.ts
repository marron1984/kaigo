import { filterRecords, getRecords } from "./data";
import type { CareRecord } from "./types";

export const FILTER_KEYS = ["user", "staff", "from", "to", "code", "flag"] as const;
export type Filters = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

export function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const f: Filters = {};
  for (const k of FILTER_KEYS) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) f[k] = s;
  }
  return f;
}

export function queryString(f: Filters): string {
  const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return q ? `?${q}` : "";
}

/** 一覧・印刷・CSVで共通の絞り込み */
export function selectRecords(f: Filters): CareRecord[] {
  let rs = filterRecords(getRecords(), f);
  if (f.flag === "reported") rs = rs.filter((r) => r.reported);
  if (f.flag === "corrected") rs = rs.filter((r) => r.history.length > 0);
  if (f.flag === "observe") rs = rs.filter((r) => r.condition !== "良好");
  return rs;
}
