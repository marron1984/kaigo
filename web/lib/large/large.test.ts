import { describe, expect, it } from "vitest";
import { runChecks } from "../checks";
import { largeDataset } from "./generate";

const ds = largeDataset();

describe("大規模モック（18名・10月）", () => {
  it("18名分・10月の記録が計画の訪問予定どおりそろっている", () => {
    expect(ds.users).toHaveLength(18);
    expect(ds.records.length).toBeGreaterThan(1700);
    expect(new Set(ds.records.map((r) => r.userId)).size).toBe(18);
    expect(ds.records.every((r) => r.date.startsWith("2026-10"))).toBe(true);
  });
  it("特記事項はすべて異なる", () => {
    expect(new Set(ds.records.map((r) => r.note)).size).toBe(ds.records.length);
  });
  it("特記事項はおおむね100文字", () => {
    const lens = ds.records.map((r) => [...r.note].length);
    const out = ds.records.filter((r) => [...r.note].length < 60 || [...r.note].length > 140).map((r) => `${r.no}:${[...r.note].length}:${r.note}`);
    expect(out.slice(0, 5)).toEqual([]);
    expect(lens.reduce((a, b) => a + b, 0) / lens.length).toBeGreaterThan(85);
  });
  it("全員が区分支給限度基準額の範囲内", () => {
    for (const u of ds.users) {
      const units = ds.records.filter((r) => r.userId === u.id).reduce((s, r) => s + r.units, 0);
      expect(units, u.id).toBeLessThanOrEqual(u.limitUnits!);
    }
  });
  it("運営指導チェックで指摘がない", () => {
    expect(runChecks(ds).slice(0, 10)).toEqual([]);
  });
  it("同じ内容で再生成される", () => {
    expect(largeDataset().records.slice(0, 50)).toEqual(ds.records.slice(0, 50));
  });
});
