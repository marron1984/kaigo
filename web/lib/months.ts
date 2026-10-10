import type { Dataset } from "./types";

/** 記録・報告書がある月（新しい順） */
export function monthsOf(ds: Dataset): string[] {
  const s = new Set([...ds.records.map((r) => r.date.slice(0, 7)), ...ds.reports.map((r) => r.month)]);
  return [...s].sort().reverse();
}

export function jpMonth(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${Number(m)}月`;
}

/** シフト作成の対象月：今月から3か月分と、作成済みの月 */
export function shiftMonths(existing: string[]): string[] {
  const t = new Date();
  const ms = [0, 1, 2].map((i) => {
    const d = new Date(t.getFullYear(), t.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  return [...new Set([...ms, ...existing])].sort();
}

export function nextMonth(): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
