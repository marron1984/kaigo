/**
 * 実地調査（運営指導）で確認されやすい項目の自動チェック。
 */
import { classify } from "./billing";
import { toMin, weekdayOf } from "./format";
import { BODY_QUALIFIED, TWO_HOUR_RULE_MIN } from "./master";
import type { CareRecord, CareUser, Staff } from "./types";

export type CheckDef = { id: string; title: string; detail: string; basis: string };

export const CHECKS: CheckDef[] = [
  { id: "C01", title: "算定区分と提供時間の整合", detail: "記録上の算定区分が、実際の提供時間から求まる区分と一致しているか", basis: "所要時間による区分の算定（実時間に基づく）" },
  { id: "C02", title: "計画区分と実績の一致", detail: "訪問介護計画・サービス提供票の区分と、実績の算定区分が一致しているか", basis: "居宅サービス計画に沿ったサービス提供" },
  { id: "C03", title: "計画外の訪問", detail: "計画にない曜日・時間帯の訪問がないか", basis: "居宅サービス計画に沿ったサービス提供" },
  { id: "C04", title: "2時間ルール", detail: "同一利用者への訪問間隔が2時間未満の場合、所要時間を合算しているか", basis: "訪問介護の所要時間の取扱い" },
  { id: "C05", title: "サービス内容と区分の整合", detail: "身体介護の区分なら身体介護、生活援助の区分なら生活援助の内容が記録されているか", basis: "サービスの具体的内容の記録" },
  { id: "C06", title: "特記事項（心身の状況）の記載", detail: "利用者の心身の状況やサービス提供時の様子が具体的に記載されているか", basis: "具体的なサービスの内容等の記録（運営基準）" },
  { id: "C07", title: "利用者確認", detail: "利用者（家族）の確認を得ているか", basis: "サービス提供の記録" },
  { id: "C08", title: "サービス提供責任者の確認", detail: "サ責が記録内容を確認しているか", basis: "サービス提供責任者の責務" },
  { id: "C09", title: "訪問介護員の資格要件", detail: "身体介護を有資格者が提供しているか", basis: "訪問介護員等の員数・資格" },
  { id: "C10", title: "訪問介護員の訪問重複", detail: "同じ職員が同じ時間帯に別の利用者を訪問していないか", basis: "勤務実態の確認" },
  { id: "C11", title: "記録の訂正履歴", detail: "記録を訂正した場合に、訂正者・日時・理由が残っているか", basis: "記録の真正性（電磁的記録）" },
  { id: "C12", title: "異変時の報告記録", detail: "要観察などの状態変化があった場合に報告先が記録されているか", basis: "緊急時等の対応" },
];

export type Finding = { checkId: string; recordNo: string; message: string };

export type CheckContext = { users: CareUser[]; staff: Staff[] };

export function runChecks(records: CareRecord[], ctx: CheckContext): Finding[] {
  const out: Finding[] = [];
  const add = (checkId: string, r: CareRecord, message: string) => out.push({ checkId, recordNo: r.no, message });
  const userById = new Map(ctx.users.map((u) => [u.id, u]));
  const staffById = new Map(ctx.staff.map((s) => [s.id, s]));

  for (const r of records) {
    const actualMin = toMin(r.end) - toMin(r.start);
    const expected = classify(r.planCode, actualMin, r.bodyMinutes);
    if (actualMin !== r.minutes) add("C01", r, `提供分数 ${r.minutes}分 が開始・終了時刻（${actualMin}分）と一致しない`);
    if (!expected) add("C01", r, `提供時間 ${actualMin}分 では算定できない`);
    else if (expected.code !== r.billingCode || expected.units !== r.units)
      add("C01", r, `記録上 ${r.billingCode}（${r.units}単位）だが、実時間からは ${expected.code}（${expected.units}単位）`);

    const user = userById.get(r.userId);
    const planCodeBase = (c: string) => c.replace(/生活\d$/, "生活");
    const plans = user?.plan.filter((p) => p.weekday === weekdayOf(r.date)) ?? [];
    const plan = plans.find((p) => Math.abs(toMin(p.start) - toMin(r.start)) <= 30);
    if (!plan) add("C03", r, `${weekdayOf(r.date)}曜 ${r.start} の訪問は計画にない`);
    else if (planCodeBase(plan.code) !== planCodeBase(r.billingCode))
      add("C02", r, `計画は ${plan.code}、実績は ${r.billingCode}`);

    const isBodyCode = r.billingCode.startsWith("身体");
    const isLifeCode = r.billingCode.includes("生活");
    if (isBodyCode && r.body.length === 0) add("C05", r, "身体介護の区分だが身体介護の内容がない");
    if (isLifeCode && r.life.length === 0) add("C05", r, "生活援助を算定しているが生活援助の内容がない");
    if (!isLifeCode && r.life.length > 0) add("C05", r, `生活援助を算定していないのに生活援助（${r.life.join("・")}）が記録されている`);
    if (!isBodyCode && r.body.length > 0) add("C05", r, `生活援助の区分だが身体介護（${r.body.join("・")}）が記録されている`);

    if (r.note.trim().length < 20) add("C06", r, "特記事項が短く、具体的な状態が読み取れない");
    if (!r.userConfirmed) add("C07", r, "利用者確認がない");
    if (!r.supervisorCheckedBy) add("C08", r, "サ責の確認がない");

    const st = staffById.get(r.staffId);
    if (!st) add("C09", r, "担当職員が職員名簿にない");
    else if (r.body.length > 0 && !BODY_QUALIFIED.includes(st.qualification))
      add("C09", r, `${st.name}（${st.qualification}）は身体介護の資格要件を満たさない`);

    for (const h of r.history) if (!h.reason.trim()) add("C11", r, `「${h.field}」の訂正に理由がない`);
    if (r.condition !== "良好" && !r.reported) add("C12", r, "状態に変化があるのに報告先の記録がない");
  }

  // 2時間ルール（同一利用者・同日）
  const byUserDay = groupBy(records, (r) => `${r.userId}|${r.date}`);
  for (const list of byUserDay.values()) {
    const sorted = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < sorted.length; i++) {
      const gap = toMin(sorted[i].start) - toMin(sorted[i - 1].end);
      if (gap < TWO_HOUR_RULE_MIN)
        add("C04", sorted[i], `前回訪問（${sorted[i - 1].no}、${sorted[i - 1].end}終了）から${gap}分。所要時間の合算が必要`);
    }
  }

  // 職員の訪問重複（同一職員・同日）
  const byStaffDay = groupBy(records, (r) => `${r.staffId}|${r.date}`);
  for (const list of byStaffDay.values()) {
    const sorted = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (toMin(sorted[i].start) < toMin(sorted[i - 1].end))
        add("C10", sorted[i], `${sorted[i - 1].no}（${sorted[i - 1].start}〜${sorted[i - 1].end}）と時間が重なっている`);
    }
  }
  return out;
}

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}
