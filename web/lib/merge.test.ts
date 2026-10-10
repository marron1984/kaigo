import { describe, expect, it } from "vitest";
import { parseCSV, parseRecords } from "./importer";
import { countChanges, mergeRows } from "./merge";
import { STAFF, USERS } from "./mock";

const csv = (rows: string[][]) => parseCSV(rows.map((r) => r.join(",")).join("\n"));
const head = ["提供日", "利用者ID", "開始", "終了", "算定区分", "担当職員", "特記事項"];
const note = "入浴前の体調確認問題なし。浴槽の出入りは手すり使用し見守り。";

describe("提供記録の読み込み", () => {
  it("記録Noがなければ 利用者ID-日付-開始時刻 で番号を付ける", () => {
    const r = parseRecords(csv([head, ["2026/10/5", "U001", "9:00", "10:00", "身体2", "S01", note]]), USERS, STAFF);
    expect(r.rows[0].no).toBe("U001-20261005-0900");
  });
  it("別々のファイルを続けて取り込んでも上書きし合わない", () => {
    const a = parseRecords(csv([head, ["2026/10/5", "U001", "9:00", "9:45", "身体2", "S01", note]]), USERS, STAFF).rows;
    const b = parseRecords(csv([head, ["2026/10/6", "U002", "10:30", "11:20", "身体2", "S03", note]]), USERS, STAFF).rows;
    const merged = mergeRows("records", mergeRows("records", [], a, "追加・更新"), b, "追加・更新");
    expect(merged).toHaveLength(2);
  });
  it("同じ訪問（利用者・日・開始時刻）は記録Noが違っても上書きする", () => {
    const a = parseRecords(csv([["記録No", ...head], ["X1", "2026/10/5", "U001", "9:00", "9:45", "身体2", "S01", note]]), USERS, STAFF).rows;
    const b = parseRecords(csv([["記録No", ...head], ["Y9", "2026/10/5", "U001", "9:00", "9:46", "身体2", "S01", note]]), USERS, STAFF).rows;
    expect(countChanges("records", a, b)).toEqual({ added: 0, updated: 1 });
    const merged = mergeRows("records", a, b, "追加・更新");
    expect(merged.map((r) => r.no)).toEqual(["Y9"]);
  });
  it("利用者IDがなく氏名だけのとき、被保険者番号が空の別人に結びつかない", () => {
    const users = [{ ...USERS[0], insuredNo: "" }, { ...USERS[1], insuredNo: "" }];
    const r = parseRecords(csv([["提供日", "利用者名", "開始", "終了", "算定区分", "担当職員", "特記事項"], ["2026/10/6", USERS[1].name, "10:30", "11:20", "身体2", "S03", note]]), users, STAFF);
    expect(r.rows[0].userId).toBe(USERS[1].id);
  });
  it("置き換えは登録済みを消す", () => {
    const a = parseRecords(csv([head, ["2026/10/5", "U001", "9:00", "9:45", "身体2", "S01", note]]), USERS, STAFF).rows;
    expect(mergeRows("records", a, [], "置き換え")).toEqual([]);
  });
});
