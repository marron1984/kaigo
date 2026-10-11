import { describe, expect, it } from "vitest";
import { ENTRY_HEADER, entryRows } from "./entryTemplate";
import { parseCSV, parseRecords } from "./importer";
import { largeDataset } from "./large/generate";

const ds = largeDataset();
const toCsv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

describe("記入用ひな形", () => {
  const u = ds.users.find((x) => x.id === "L17")!;
  const rows = entryRows(u, ds.plans, "2026-10");
  it("計画の訪問予定が日付・時刻順に入る", () => {
    expect(rows.length).toBe(ds.records.filter((r) => r.userId === "L17").length);
    expect(rows[0].slice(1, 9)).toEqual(["2026/10/01", "木", "L17", u.name, "08:00", "08:25", "身体1", "身体1"]);
    expect(rows[0][10]).toBe("244");
  });
  it("未記入のまま取り込むと全行読み飛ばす", () => {
    const r = parseRecords(parseCSV(toCsv([ENTRY_HEADER, ...rows])), ds.users, ds.staff);
    expect(r.rows).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(r.warnings[0].message).toContain(`未記入の行 ${rows.length}件`);
  });
  it("書き込んだ行だけ取り込まれる", () => {
    const filled = rows.map((r) => [...r]);
    filled[0][11] = "おむつ交換・食事介助"; filled[0][13] = ds.staff[0].name; filled[0][20] = "朝食を8割摂取し、むせ込みはなかった。おむつ交換時の皮膚に異常なし。"; filled[0][22] = "済";
    const r = parseRecords(parseCSV(toCsv([ENTRY_HEADER, ...filled])), ds.users, ds.staff);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ userId: "L17", date: "2026-10-01", start: "08:00", units: 244, staffId: ds.staff[0].id, userConfirmed: true });
    expect(r.unknownHeaders).toEqual([]);
  });
});
