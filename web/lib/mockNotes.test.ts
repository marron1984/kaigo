import { describe, expect, it } from "vitest";
import { generateRecords } from "./mock";
import { MOCK_NOTES } from "./mockNotes";

const records = generateRecords();

describe("モックの特記事項", () => {
  it("全記録に特記事項があり、使われない文がない", () => {
    expect(records).toHaveLength(Object.keys(MOCK_NOTES).length);
  });
  it("すべて異なる文章", () => {
    expect(new Set(records.map((r) => r.note)).size).toBe(records.length);
  });
  it("おおむね100文字（80〜125文字）", () => {
    const bad = records.filter((r) => [...r.note].length < 80 || [...r.note].length > 125).map((r) => `${r.no} ${[...r.note].length}`);
    expect(bad).toEqual([]);
  });
  it("区分とサービス内容が合っている", () => {
    for (const r of records) {
      if (r.billingCode.startsWith("身体")) expect(r.body.length, r.no).toBeGreaterThan(0);
      if (!r.billingCode.includes("生活")) expect(r.life, r.no).toEqual([]);
      if (!r.billingCode.startsWith("身体")) expect(r.body, r.no).toEqual([]);
    }
  });
});
