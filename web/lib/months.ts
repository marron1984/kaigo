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
