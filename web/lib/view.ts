import { runChecks, type Finding } from "./checks";
import { getRecords, getStaff, getUsers } from "./data";

let cache: Finding[] | null = null;

/** 全記録のチェック結果（モックは不変なので一度だけ計算） */
export function allFindings(): Finding[] {
  cache ??= runChecks(getRecords(), { users: getUsers(), staff: getStaff() });
  return cache;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function param(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}
