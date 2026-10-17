/**
 * 提供記録の記入例（サンプル）。大規模モック（架空の利用者）から、書き方の見本になる記録を選んで
 * 取り込み用CSVの形にする。利用者・職員・訪問介護計画もセットで出し、順に取り込めば運営指導チェックを通る。
 */
import { ENTRY_HEADER } from "./entryTemplate";
import { weekdayOf } from "./format";
import { largeDataset } from "./large/generate";
import type { Dataset } from "./types";

export const SAMPLE_USERS = ["L01", "L03", "L07", "L10", "L14", "L17"];
const SAMPLE_DAYS = ["2026-10-09", "2026-10-10"];

const slash = (d: string) => d.replaceAll("-", "/");
const dt = (iso: string | null) => (iso ? `${slash(iso.slice(0, 10))} ${iso.slice(11, 16)}` : "");

export function buildSample(ds: Dataset = largeDataset()) {
  const users = ds.users.filter((u) => SAMPLE_USERS.includes(u.id));
  // 2日分の全訪問と、状態の変化・報告があった記録（書き方の見本として重要）
  const records = ds.records.filter((r) => SAMPLE_USERS.includes(r.userId) && (SAMPLE_DAYS.includes(r.date) || r.reported));
  const staffIds = new Set([...records.map((r) => r.staffId), ...records.map((r) => r.supervisorCheckedBy ?? "")]);
  const staff = ds.staff.filter((s) => staffIds.has(s.id));
  const plans = ds.plans.filter((p) => SAMPLE_USERS.includes(p.userId));
  const staffName = (id: string | null) => ds.staff.find((s) => s.id === id)?.name ?? "";
  const userName = (id: string) => ds.users.find((u) => u.id === id)?.name ?? id;

  const userRows = [
    ["利用者ID", "氏名", "フリガナ", "性別", "生年月日", "要介護度", "認定有効期間開始", "認定有効期間終了", "被保険者番号", "保険者番号", "負担割合", "居宅介護支援事業所", "担当ケアマネ", "契約日", "区分支給限度基準額", "備考"],
    ...users.map((u) => [u.id, u.name, u.kana, u.sex, slash(u.birthDate), u.careLevel, slash(u.certFrom), slash(u.certTo), u.insuredNo, u.insurerNo, u.burden, u.cmOffice, u.careManager, slash(u.contractDate), String(u.limitUnits ?? ""), `【サンプル・架空】${u.note}`]),
  ];
  const W = ["月", "火", "水", "木", "金", "土", "日"] as const;
  const staffRows = [
    ["職員ID", "氏名", "資格", "職種", "雇用形態", ...W, "週の上限時間"],
    ...staff.map((s) => [s.id, s.name, s.qualification, s.role, s.employment ?? "", ...W.map((w) => s.availability?.[w]?.map((r) => `${r.from}-${r.to}`).join("、") ?? "×"), s.maxWeeklyMinutes ? String(s.maxWeeklyMinutes / 60) : ""]),
  ];
  const planRows = [
    ["計画ID", "利用者ID", "利用者名", "作成日", "作成者", "ケアプラン作成日", "同意日", "交付日", "計画開始日", "計画終了日", "本人・家族の意向", "長期目標", "短期目標1", "短期目標2", "短期目標3", "曜日", "開始時刻", "所要時間", "サービス区分", "身体介護時間", "サービス内容", "留意事項"],
    ...plans.flatMap((p) => {
      // 同じ時間・区分のサービス枠は曜日をまとめて1行にする
      const groups = new Map<string, { s: (typeof p.services)[number]; days: string[] }>();
      for (const s of p.services) {
        const k = `${s.start}|${s.code}|${s.minutes}`;
        const g = groups.get(k) ?? { s, days: [] };
        g.days.push(s.weekday);
        groups.set(k, g);
      }
      return [...groups.values()].map(({ s, days }, i) => [
        p.id, p.userId, i === 0 ? userName(p.userId) : "", i === 0 ? slash(p.createdAt) : "", i === 0 ? p.createdBy : "", i === 0 ? slash(p.carePlanDate) : "",
        i === 0 ? slash(p.agreedAt) : "", i === 0 ? slash(p.deliveredAt) : "", i === 0 ? slash(p.periodFrom) : "", i === 0 ? slash(p.periodTo) : "",
        i === 0 ? p.wish : "", i === 0 ? p.longGoal : "", i === 0 ? p.shortGoals[0] ?? "" : "", i === 0 ? p.shortGoals[1] ?? "" : "", i === 0 ? p.shortGoals[2] ?? "" : "",
        W.filter((w) => days.includes(w)).join("・"), s.start, String(s.minutes), s.code, s.bodyMinutes !== undefined ? String(s.bodyMinutes) : "", s.content, s.caution,
      ]);
    }),
  ];
  const recordRows = [
    ENTRY_HEADER,
    ...records.map((r) => [
      r.no, slash(r.date), weekdayOf(r.date), r.userId, userName(r.userId), r.start, r.end, r.planCode, r.billingCode,
      r.bodyMinutes !== undefined ? String(r.bodyMinutes) : "", String(r.units), r.body.join("・"), r.life.join("・"), staffName(r.staffId),
      r.vitals.temp != null ? r.vitals.temp.toFixed(1) : "", r.vitals.bp, r.vitals.pulse != null ? String(r.vitals.pulse) : "",
      r.condition, r.meal, r.excretion, r.note, r.reportTo, r.userConfirmed ? "済" : "", dt(r.supervisorCheckedAt), staffName(r.supervisorCheckedBy),
    ]),
  ];
  return { userRows, staffRows, planRows, recordRows };
}
