/**
 * 提供記録の記入用ひな形（予定入りCSV）。
 * 訪問介護計画から、利用者ごとに日付・時間・区分・単位数を先に入れ、ケアの内容は空欄にする。
 * 書き込んだあとは、そのまま「提供記録を読み込む」で取り込める（未記入の行は読み飛ばす）。
 */
import { classify, unitsWithTime } from "./billing";
import { fromMin, toMin, weekdayOf } from "./format";
import { monthRange, plannedSlots } from "./plan";
import type { CarePlan, CareUser } from "./types";

export const ENTRY_HEADER = [
  "記録No", "提供日", "曜日", "利用者ID", "利用者名", "開始", "終了", "計画区分", "算定区分", "身体介護時間", "単位数",
  "身体介護", "生活援助", "担当職員", "体温", "血圧", "脈拍", "顔色・様子", "食事摂取", "排泄", "特記事項", "報告先", "利用者確認", "サ責確認日時", "サ責確認者",
];

/** 記入欄の説明（Excelの「記入方法」シート用） */
export const ENTRY_GUIDE: [string, string][] = [
  ["記録No", "空欄でかまいません（取り込み時に「利用者ID-提供日-開始時刻」で付番）"],
  ["提供日〜単位数", "訪問介護計画から入れてあります。実際の時刻が違うときは開始・終了を書き換えてください"],
  ["身体介護", "行った内容を「・」区切りで（例：排泄介助・更衣介助・服薬確認）"],
  ["生活援助", "行った内容を「・」区切りで（例：掃除・洗濯・調理）"],
  ["担当職員", "職員名簿の氏名または職員ID（必須）"],
  ["体温・血圧・脈拍", "例：36.5 ／ 128/76 ／ 72"],
  ["顔色・様子", "良好・要観察 など"],
  ["食事摂取・排泄", "例：8割 ／ 尿○ 便×"],
  ["特記事項", "利用者の状態とサービス提供時の様子を具体的に（運営指導で確認される欄）"],
  ["報告先", "状態の変化を報告した場合に記入（例：サービス提供責任者・介護支援専門員）"],
  ["利用者確認", "確認を得たら「済」"],
  ["サ責確認日時・サ責確認者", "サービス提供責任者が確認した日時と氏名（例：2026/10/6 9:30）"],
  ["未記入の行", "担当職員・身体介護・生活援助・特記事項がすべて空欄の行は、取り込み時に読み飛ばします"],
];

export function entryRows(user: CareUser, plans: CarePlan[], month: string): string[][] {
  const { from, to } = monthRange(month);
  return plannedSlots(plans, user.id, from, to)
    .sort((a, b) => a.date.localeCompare(b.date) || a.service.start.localeCompare(b.service.start))
    .map(({ date, service: s }) => {
      const bill = classify(s.code, s.minutes, s.bodyMinutes);
      return [
        "", date.replaceAll("-", "/"), weekdayOf(date), user.id, user.name, s.start, fromMin(toMin(s.start) + s.minutes), s.code, bill?.code ?? s.code,
        s.bodyMinutes !== undefined ? String(s.bodyMinutes) : "", bill ? String(unitsWithTime(bill.units, s.start)) : "",
        "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      ];
    });
}

/** Excelのシート名に使えない文字を除き、31文字以内にする */
export function sheetName(user: CareUser): string {
  return `${user.name}`.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || user.id;
}
