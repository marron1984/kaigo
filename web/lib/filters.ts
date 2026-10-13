import { isChanged } from "./checks";
import type { CareRecord } from "./types";

export const FILTER_KEYS = ["user", "staff", "from", "to", "code", "flag"] as const;
export type Filters = Partial<Record<(typeof FILTER_KEYS)[number], string>>;
export type SP = Promise<Record<string, string | string[] | undefined>>;

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

export function applyFilters(records: CareRecord[], f: Filters, flagged?: Set<string>): CareRecord[] {
  return records.filter(
    (r) =>
      (!f.user || r.userId === f.user) &&
      (!f.staff || r.staffId === f.staff) &&
      (!f.from || r.date >= f.from) &&
      (!f.to || r.date <= f.to) &&
      (!f.code || r.billingCode === f.code) &&
      (f.flag !== "reported" || r.reported) &&
      (f.flag !== "corrected" || r.history.length > 0) &&
      (f.flag !== "observe" || isChanged(r.condition)) &&
      (f.flag !== "finding" || !!flagged?.has(r.no)),
  );
}
