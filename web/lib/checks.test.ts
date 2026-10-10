import { describe, expect, it } from "vitest";
import { classify } from "./billing";
import { runChecks } from "./checks";
import { generateRecords, STAFF, USERS } from "./mock";
import type { CareRecord } from "./types";

const ctx = { users: USERS, staff: STAFF };
const base = () => structuredClone(generateRecords());
const ids = (rs: CareRecord[]) => runChecks(rs, ctx).map((f) => f.checkId);

describe("classify", () => {
  it("身体介護の区分", () => {
    expect(classify("身体1", 19)?.code).toBe("身体0");
    expect(classify("身体1", 29)?.code).toBe("身体1");
    expect(classify("身体2", 30)?.code).toBe("身体2");
    expect(classify("身体2", 60)?.code).toBe("身体3");
  });
  it("生活援助の区分", () => {
    expect(classify("生活2", 19)).toBeNull();
    expect(classify("生活2", 44)?.code).toBe("生活2");
    expect(classify("生活3", 45)?.code).toBe("生活3");
  });
  it("身体＋生活の加算", () => {
    expect(classify("身体1生活1", 60, 25)).toEqual({ code: "身体1生活1", units: 244 + 65 });
    expect(classify("身体1生活1", 70, 25)).toEqual({ code: "身体1生活2", units: 244 + 130 });
  });
});

describe("モックデータ", () => {
  it("全件が全チェックを通過する", () => {
    expect(runChecks(generateRecords(), ctx)).toEqual([]);
  });
  it("毎回同じ内容が生成される", () => {
    expect(generateRecords()).toEqual(generateRecords());
  });
});

describe("指摘の検出", () => {
  it("C01 終了時刻を延ばすと区分不一致", () => {
    const rs = base();
    const r = rs.find((x) => x.billingCode === "身体1")!;
    r.end = "23:00";
    expect(ids(rs)).toContain("C01");
  });
  it("C03 計画外の訪問", () => {
    const rs = base();
    rs[0].start = "20:00";
    expect(ids(rs)).toContain("C03");
  });
  it("C04 2時間ルール", () => {
    const rs = base();
    const am = rs.find((x) => x.userId === "U004" && x.start < "12:00")!;
    const pm = rs.find((x) => x.userId === "U004" && x.date === am.date && x.start > "12:00")!;
    pm.start = "09:00";
    pm.end = "09:28";
    expect(ids(rs)).toContain("C04");
  });
  it("C05 身体区分なのに生活援助", () => {
    const rs = base();
    rs.find((x) => x.billingCode === "身体2")!.life = ["掃除"];
    expect(ids(rs)).toContain("C05");
  });
  it("C06/C07/C08/C11/C12", () => {
    const rs = base();
    Object.assign(rs[0], { note: "変わりなし", userConfirmed: false, supervisorCheckedBy: null, condition: "要観察", reported: false });
    rs[0].history.push({ at: "2026-10-02T10:00", by: "S01", field: "開始時刻", before: "10:00", after: "10:30", reason: "" });
    expect(ids(rs)).toEqual(expect.arrayContaining(["C06", "C07", "C08", "C11", "C12"]));
  });
  it("C09 無資格者の身体介護", () => {
    const rs = base();
    const r = rs.find((x) => x.body.length > 0)!;
    const staff = [...STAFF, { id: "S99", name: "無資格 太郎", qualification: "なし", role: "訪問介護員" as const }];
    r.staffId = "S99";
    expect(runChecks(rs, { users: USERS, staff }).map((f) => f.checkId)).toContain("C09");
  });
  it("C10 職員の訪問重複", () => {
    const rs = base();
    const [a, b] = rs.filter((x) => x.date === "2026-10-05");
    b.staffId = a.staffId;
    b.start = a.start;
    b.end = a.end;
    b.minutes = a.minutes;
    expect(ids(rs)).toContain("C10");
  });
});
