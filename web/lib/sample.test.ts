import { describe, expect, it } from "vitest";
import { runChecks } from "./checks";
import { parseCSV, parsePlans, parseRecords, parseStaff, parseUsers } from "./importer";
import { buildSample } from "./sample";

const toCsv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");

describe("提供記録のサンプル（記入例）", () => {
  const s = buildSample();
  const users = parseUsers(parseCSV(toCsv(s.userRows)));
  const staff = parseStaff(parseCSV(toCsv(s.staffRows)));
  const plans = parsePlans(parseCSV(toCsv(s.planRows)), users.rows);
  const recs = parseRecords(parseCSV(toCsv(s.recordRows)), users.rows, staff.rows);

  it("4つのCSVがエラー・注意なしで取り込める", () => {
    for (const r of [users, staff, plans, recs]) {
      expect(r.errors).toEqual([]);
      expect(r.unknownHeaders).toEqual([]);
    }
    expect(users.warnings).toEqual([]);
    expect(recs.warnings).toEqual([]);
    expect(users.rows).toHaveLength(6);
    expect(recs.rows.length).toBeGreaterThan(40);
  });
  it("全項目が埋まっている", () => {
    for (const r of recs.rows) {
      expect(r.staffId, r.no).not.toBe("");
      expect(r.userConfirmed).toBe(true);
      expect(r.supervisorCheckedBy).not.toBeNull();
      expect(r.body.length + r.life.length).toBeGreaterThan(0);
    }
    expect(recs.rows.some((r) => r.reported)).toBe(true);
  });
  it("取り込んだ結果が運営指導チェックを通る（10月の介護報告書は対象外）", () => {
    const f = runChecks({ users: users.rows, staff: staff.rows, plans: plans.rows, records: recs.rows, reports: [] });
    expect(f.filter((x) => x.checkId !== "C18")).toEqual([]);
  });
});
