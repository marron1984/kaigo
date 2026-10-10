import { describe, expect, it } from "vitest";
import { mockDataset } from "./mock";
import { generateShift, validateShift, visitsOf, weekKey } from "./shift";
import type { Staff } from "./types";

const ds = mockDataset();
const visits = visitsOf(ds.plans, ds.users, "2026-10");

describe("訪問予定の展開", () => {
  it("10月の計画から訪問予定を作る", () => {
    // 山田(月水金)13 + 佐藤(月火木土)18 + 鈴木(火金)9 + 高橋(月水金×2)26 + 田中(木)5
    expect(visits).toHaveLength(13 + 18 + 9 + 26 + 5);
    expect(visits[0]).toMatchObject({ date: "2026-10-01", userId: "U002", start: "10:30" }); // 10/1は木曜
  });
  it("週は月曜始まり", () => {
    expect(weekKey("2026-10-04")).toBe("2026-09-28");
    expect(weekKey("2026-10-05")).toBe("2026-10-05");
  });
});

describe("シフトの自動作成", () => {
  const res = generateShift(visits, ds.staff, ds.users);
  const v = validateShift(visits, ds.staff, ds.users, res.assignments, 15);

  it("モックでは全訪問に担当が決まり、条件違反がない", () => {
    expect(res.unassigned).toEqual([]);
    expect([...v.issues]).toEqual([]);
  });
  it("週の上限時間を守る", () => {
    for (const s of ds.staff) for (const m of v.totals.get(s.id)!.weeks.values()) expect(m).toBeLessThanOrEqual(s.maxWeeklyMinutes!);
  });
  it("同じ曜日・時間の枠は同じ職員が担当する", () => {
    const fri = visits.filter((x) => x.userId === "U004" && x.start === "07:30" && new Date(x.date).getDay() === 5);
    expect(new Set(fri.map((x) => res.assignments[x.key].staffId)).size).toBe(1);
  });
  it("担当しない利用者・資格・勤務時間を守る", () => {
    for (const x of visits) {
      const s = ds.staff.find((st) => st.id === res.assignments[x.key].staffId)!;
      if (x.userId === "U005") expect(s.id).not.toBe("S05");
      if (x.start === "07:30") expect(["S03"]).toContain(s.id);
    }
  });
  it("固定した割り当ては残す", () => {
    const k = visits.find((x) => x.userId === "U001")!.key;
    const r = generateShift(visits, ds.staff, ds.users, { keep: { [k]: { staffId: "S03", locked: true } } });
    expect(r.assignments[k]).toEqual({ staffId: "S03", locked: true });
  });
  it("担当できる職員がいなければ理由つきで未割当", () => {
    const only: Staff[] = [{ id: "X1", name: "初任 一人", qualification: "初任者研修", role: "訪問介護員", availability: { 月: [{ from: "09:00", to: "12:00" }] } }];
    const r = generateShift(visits, only, ds.users);
    const u = r.unassigned.find((x) => x.key.includes("U004"))!;
    expect(u.reason).toContain("勤務可能時間外");
  });
  it("手で変えた割り当ての違反を検出する", () => {
    const a = { ...res.assignments };
    const early = visits.find((x) => x.start === "07:30")!;
    a[early.key] = { staffId: "S05", locked: true };
    expect(validateShift(visits, ds.staff, ds.users, a, 15).issues.get(early.key)).toBe("勤務可能時間外");
  });
});
