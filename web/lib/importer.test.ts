import { describe, expect, it } from "vitest";
import { normalizeCode, splitServices, parseCSV, parseDateJP, parsePlans, parseRecords, parseStaff, parseRanges, parseTime, parseUsers, parseWeekdays, TEMPLATES, templateCSV } from "./importer";

describe("値の変換", () => {
  it("日付（西暦・和暦・Excel）", () => {
    expect(parseDateJP("2026/10/1")).toBe("2026-10-01");
    expect(parseDateJP("２０２６年１０月１日")).toBe("2026-10-01");
    expect(parseDateJP("令和8年10月1日")).toBe("2026-10-01");
    expect(parseDateJP("R8.10.1")).toBe("2026-10-01");
    expect(parseDateJP("昭和17年5月12日")).toBe("1942-05-12");
    expect(parseDateJP("令和元年5月1日")).toBe("2019-05-01");
    expect(parseDateJP("46296")).toBe("2026-10-01");
    expect(parseDateJP("2026/2/30")).toBeNull();
  });
  it("時刻", () => {
    expect(parseTime("9:00")).toBe("09:00");
    expect(parseTime("9時30分")).toBe("09:30");
    expect(parseTime("0.375")).toBe("09:00");
    expect(parseTime("25:00")).toBeNull();
  });
  it("区分の表記ゆれ", () => {
    expect(normalizeCode("身体介護2")).toBe("身体2");
    expect(normalizeCode("身1生1")).toBe("身体1生活1");
    expect(normalizeCode("生活援助3")).toBe("生活3");
  });
  it("曜日", () => {
    expect(parseWeekdays("月・水・金")).toEqual(["月", "水", "金"]);
    expect(parseWeekdays("月〜金")).toEqual(["月", "火", "水", "木", "金"]);
    expect(parseWeekdays("毎日")).toHaveLength(7);
    expect(parseWeekdays("週3")).toEqual([]);
  });
  it("CSV（引用符・改行）", () => {
    expect(parseCSV('a,b\r\n"x,1","改\n行"\r\n')).toEqual([["a", "b"], ["x,1", "改\n行"]]);
  });
});

const table = (kind: keyof typeof TEMPLATES) => parseCSV(templateCSV(kind));

describe("テンプレートの取り込み", () => {
  it("利用者", () => {
    const r = parseUsers(table("users"));
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ id: "U001", birthDate: "1942-05-12", certFrom: "2026-04-01", careLevel: "要介護2" });
  });
  it("訪問介護計画（複数行を1計画にまとめ、曜日を展開）", () => {
    const users = parseUsers(table("users")).rows;
    const r = parsePlans(table("plans"), users);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].services.map((s) => `${s.weekday}${s.code}`)).toEqual(["月身体1生活1", "金身体1生活1", "水身体2"]);
    expect(r.rows[0].shortGoals).toHaveLength(2);
  });
  it("職員・記録", () => {
    const users = parseUsers(table("users")).rows;
    const staff = parseStaff(table("staff")).rows;
    const r = parseRecords(table("records"), users, staff);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ userId: "U001", staffId: "S01", minutes: 60, units: 309, userConfirmed: true, supervisorCheckedBy: "S01" });
  });
  it("職員の勤務条件", () => {
    const s = parseStaff(table("staff")).rows;
    expect(s[0]).toMatchObject({ employment: "常勤", maxWeeklyMinutes: 1200 });
    expect(s[0].availability?.月).toEqual([{ from: "08:30", to: "17:30" }]);
    expect(s[0].availability?.土).toBeUndefined();
    expect(s[1].preferredUsers).toEqual(["U001"]);
    expect(parseRanges("9:00〜12:00、14:00〜18:00")).toEqual([{ from: "09:00", to: "12:00" }, { from: "14:00", to: "18:00" }]);
    expect(parseRanges("○")).toEqual([{ from: "07:00", to: "20:00" }]);
    expect(parseRanges("12:00-9:00")).toBeNull();
  });
  it("生活保護の H 番号は注意にしない", () => {
    expect(parseUsers([["氏名", "被保険者番号"], ["テスト", "H111111111"]]).warnings.some((w) => w.message.includes("被保険者番号"))).toBe(false);
    expect(parseUsers([["氏名", "被保険者番号"], ["テスト", "12345"]]).warnings.some((w) => w.message.includes("被保険者番号"))).toBe(true);
  });
  it("見出しの表記ゆれと必須列の不足", () => {
    const r = parseUsers([["利用者番号", "利用者名", "介護度"], ["10", "テスト 太郎", "介護3"]]);
    expect(r.rows[0]).toMatchObject({ id: "10", careLevel: "要介護3" });
    expect(parseUsers([["番号"], ["1"]]).errors[0].message).toContain("氏名");
  });
  it("不正な値はエラー行になる", () => {
    const users = parseUsers(table("users")).rows;
    const t = table("plans");
    t[1][15] = "週3";
    const r = parsePlans(t, users);
    expect(r.errors.some((e) => e.row === 2 && e.message.includes("曜日"))).toBe(true);
  });
});

describe("サービス内容の文章からの振り分け", () => {
  it("項目名の並びはそのまま", () => {
    expect(splitServices("排泄介助・更衣介助", ["排泄介助", "更衣介助"])).toEqual({ items: ["排泄介助", "更衣介助"], detail: "" });
  });
  it("文章は言葉から項目を判断し、原文を残す", () => {
    const BODY = ["起床介助", "整容", "自立支援見守り", "就寝介助", "排泄介助"];
    expect(splitServices("起床時の声かけ、体調確認、整容等の必要な介助を実施。", BODY).items).toEqual(["起床介助", "整容"]);
    expect(splitServices("できる動作は本人に行っていただき、自立支援に配慮した。", BODY).items).toEqual(["自立支援見守り"]);
    const r = splitServices("夕方の安否・体調確認を行い、身の回りの介助を実施。", BODY);
    expect(r.items).toEqual([]);
    expect(r.detail).toContain("安否");
  });
});

describe("報告先の読み取り", () => {
  it("「なし（○○）」は報告なし", () => {
    const users = parseUsers(parseCSV(templateCSV("users"))).rows;
    const head = ["提供日", "利用者ID", "開始", "終了", "算定区分", "担当職員", "特記事項", "報告先"];
    const t = [head, ["2026/10/5", "U001", "9:00", "10:00", "身体1生活1", "S01", "入浴前の体調確認問題なし。浴槽の出入りは手すりで見守り。", "なし（教材用）"]];
    const r = parseRecords(t, users, []);
    expect(r.rows[0]).toMatchObject({ reported: false, reportTo: "", condition: "良好" });
  });
});
