import { describe, expect, it } from "vitest";
import { classify, unitsOfCode } from "./billing";
import { runChecks } from "./checks";
import { generateRecords, mockDataset, STAFF } from "./mock";
import { draftReport } from "./report";
import type { Dataset } from "./types";

const ds = (): Dataset => structuredClone(mockDataset());
const ids = (d: Dataset) => runChecks(d).map((f) => f.checkId);

describe("区分と単位", () => {
  it("身体介護", () => {
    expect(classify("身体1", 19)?.code).toBe("身体0");
    expect(classify("身体1", 29)?.code).toBe("身体1");
    expect(classify("身体2", 30)?.code).toBe("身体2");
    expect(classify("身体2", 60)?.code).toBe("身体3");
  });
  it("生活援助", () => {
    expect(classify("生活2", 19)).toBeNull();
    expect(classify("生活2", 44)?.code).toBe("生活2");
    expect(classify("生活3", 45)?.code).toBe("生活3");
  });
  it("身体＋生活", () => {
    expect(classify("身体1生活1", 60, 25)).toEqual({ code: "身体1生活1", units: 244 + 65 });
    expect(classify("身体1生活1", 70, 25)).toEqual({ code: "身体1生活2", units: 244 + 130 });
    expect(unitsOfCode("身体1生活2")).toBe(374);
    expect(unitsOfCode("生活3")).toBe(220);
    expect(unitsOfCode("身体9")).toBeNull();
  });
});

describe("モックデータ", () => {
  it("全件が全チェックを通過する", () => {
    expect(runChecks(mockDataset())).toEqual([]);
  });
  it("毎回同じ内容が生成される", () => {
    expect(generateRecords()).toEqual(generateRecords());
  });
});

describe("指摘の検出", () => {
  it("C01 実時間が計画区分から外れる", () => {
    const d = ds();
    const r = d.records.find((x) => x.billingCode === "身体1")!;
    r.end = "23:00";
    r.minutes = 0;
    expect(ids(d)).toContain("C01");
  });
  it("C02 算定区分が計画と違う", () => {
    const d = ds();
    const r = d.records.find((x) => x.billingCode === "身体2")!;
    r.billingCode = "身体3";
    r.units = 567;
    expect(ids(d)).toContain("C02");
  });
  it("C03 計画外の訪問・計画のない日", () => {
    const d = ds();
    d.records[0].start = "20:00";
    expect(ids(d)).toContain("C03");
    const d2 = ds();
    d2.plans = d2.plans.filter((p) => p.userId !== d2.records[0].userId);
    expect(runChecks(d2).some((f) => f.checkId === "C03" && f.message.includes("有効な訪問介護計画がない"))).toBe(true);
  });
  it("C04 2時間ルール", () => {
    const d = ds();
    const am = d.records.find((x) => x.userId === "U004" && x.start < "12:00")!;
    const pm = d.records.find((x) => x.userId === "U004" && x.date === am.date && x.start > "12:00")!;
    Object.assign(pm, { start: "09:00", end: "09:28" });
    expect(ids(d)).toContain("C04");
  });
  it("C05 身体区分なのに生活援助", () => {
    const d = ds();
    d.records.find((x) => x.billingCode === "身体2")!.life = ["掃除"];
    expect(ids(d)).toContain("C05");
  });
  it("C06/C07/C08/C11/C12", () => {
    const d = ds();
    Object.assign(d.records[0], { note: "変わりなし", userConfirmed: false, supervisorCheckedBy: null, condition: "要観察", reported: false });
    d.records[0].history.push({ at: "2026-09-02T10:00", by: "S01", field: "開始時刻", before: "10:00", after: "10:30", reason: "" });
    expect(ids(d)).toEqual(expect.arrayContaining(["C06", "C07", "C08", "C11", "C12"]));
  });
  it("C09 無資格者の身体介護", () => {
    const d = ds();
    d.staff = [...STAFF, { id: "S99", name: "無資格 太郎", qualification: "なし", role: "訪問介護員" }];
    d.records.find((x) => x.body.length > 0)!.staffId = "S99";
    expect(ids(d)).toContain("C09");
  });
  it("C10 職員の訪問重複", () => {
    const d = ds();
    const [a, b] = d.records.filter((x) => x.date === "2026-09-07");
    Object.assign(b, { staffId: a.staffId, start: a.start, end: a.end, minutes: a.minutes });
    expect(ids(d)).toContain("C10");
  });
  it("C13 同意前の提供 / C14 記載漏れ / C15 前後関係", () => {
    const d = ds();
    const p = d.plans.find((x) => x.id === "P-U002-1")!;
    p.agreedAt = "2026-09-15";
    p.deliveredAt = "";
    p.carePlanDate = "2026-07-28";
    expect(ids(d)).toEqual(expect.arrayContaining(["C13", "C14", "C15"]));
  });
  it("C16 認定有効期間外 / C17 契約前の提供", () => {
    const d = ds();
    Object.assign(d.users[0], { certTo: "2026-09-10", contractDate: "2026-09-20" });
    expect(ids(d)).toEqual(expect.arrayContaining(["C16", "C17"]));
  });
  it("C18 報告書の未作成・下書き・未送付", () => {
    const d = ds();
    d.reports = d.reports.filter((r) => r.userId !== "U001");
    d.reports[0].status = "下書き";
    d.reports[1].sentAt = null;
    const msgs = runChecks(d).filter((f) => f.checkId === "C18").map((f) => f.message);
    expect(msgs.some((m) => m.includes("報告書がない"))).toBe(true);
    expect(msgs.some((m) => m.includes("下書き"))).toBe(true);
    expect(msgs.some((m) => m.includes("未送付"))).toBe(true);
  });
});

describe("介護報告書の下書き", () => {
  it("計画の目標と実施回数を反映する", () => {
    const d = mockDataset();
    const u = d.users.find((x) => x.id === "U004")!;
    const r = draftReport(u, "2026-09", d.plans, d.records, "中村 真理", "2026-10-02T10:00");
    expect(r.planId).toBe("P-U004-1");
    expect(r.goalEvaluations.map((g) => g.goal)).toContain("褥瘡を作らず、清潔で安楽に在宅生活を送れる。");
    expect(r.serviceSummary).toContain("計画どおり実施した");
  });
});
