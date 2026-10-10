/**
 * データアクセス層。現在はモックデータを返す。
 * Firestore に切り替える場合はこのファイルの実装だけを差し替える。
 */
import { generateRecords, PERIOD, STAFF, USERS } from "./mock";
import type { CareRecord, CareUser, Staff } from "./types";

const RECORDS = generateRecords();

export function getPeriod() {
  return PERIOD;
}
export function getUsers(): CareUser[] {
  return USERS;
}
export function getUser(id: string): CareUser | undefined {
  return USERS.find((u) => u.id === id);
}
export function getStaff(): Staff[] {
  return STAFF;
}
export function getStaffById(id: string | null): Staff | undefined {
  return STAFF.find((s) => s.id === id);
}
export function getRecords(): CareRecord[] {
  return RECORDS;
}
export function getRecord(no: string): CareRecord | undefined {
  return RECORDS.find((r) => r.no === no);
}

export type RecordFilter = { user?: string; staff?: string; from?: string; to?: string; code?: string };

export function filterRecords(records: CareRecord[], f: RecordFilter): CareRecord[] {
  return records.filter(
    (r) =>
      (!f.user || r.userId === f.user) &&
      (!f.staff || r.staffId === f.staff) &&
      (!f.from || r.date >= f.from) &&
      (!f.to || r.date <= f.to) &&
      (!f.code || r.billingCode === f.code),
  );
}
