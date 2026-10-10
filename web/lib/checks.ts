/**
 * 運営指導で確認されやすい項目の自動チェック。
 * 記録の形式上の整合を確認するもので、書類の有無そのものは自己点検（/self-check）で管理する。
 */
import { classify, unitsWithTime } from "./billing";
import { toMin, weekdayOf } from "./format";
import { BODY_QUALIFIED, TWO_HOUR_RULE_MIN } from "./master";
import { activePlan, matchService, monthRange } from "./plan";
import type { Dataset } from "./types";

export type CheckGroup = "記録" | "計画" | "報告" | "利用者";
export type CheckDef = { id: string; group: CheckGroup; title: string; detail: string; basis: string };

export const CHECKS: CheckDef[] = [
  { id: "C01", group: "記録", title: "実提供時間と計画区分の乖離", detail: "開始・終了時刻と提供分数が一致し、実際の提供時間が計画区分の時間帯から外れていないか（外れが続く場合は計画の見直しが必要）", basis: "所要時間は訪問介護計画に位置付けた標準的な時間で算定し、実績と大きく乖離する場合は計画を見直す" },
  { id: "C02", group: "記録", title: "算定区分・単位数と計画の一致", detail: "記録の算定区分と単位数が、訪問介護計画のサービス区分と一致しているか", basis: "訪問介護計画に基づく算定" },
  { id: "C03", group: "記録", title: "計画に基づかない訪問", detail: "有効な訪問介護計画がない日、または計画にない曜日・時間帯の訪問がないか", basis: "訪問介護計画に基づくサービス提供" },
  { id: "C04", group: "記録", title: "2時間ルール", detail: "同一利用者への訪問間隔が2時間未満の場合、所要時間を合算しているか（20分未満の身体介護は対象外）", basis: "訪問介護の所要時間の取扱い" },
  { id: "C05", group: "記録", title: "サービス内容と区分の整合", detail: "身体介護の区分なら身体介護、生活援助の区分なら生活援助の内容が記録されているか", basis: "サービスの具体的内容の記録" },
  { id: "C06", group: "記録", title: "特記事項（心身の状況）の記載", detail: "利用者の心身の状況やサービス提供時の様子が具体的に記載されているか", basis: "提供した具体的なサービスの内容等の記録" },
  { id: "C07", group: "記録", title: "利用者確認", detail: "利用者（家族）の確認を得ているか", basis: "サービス提供の記録" },
  { id: "C08", group: "記録", title: "サービス提供責任者の確認", detail: "サ責が記録内容を確認しているか", basis: "サービス提供責任者の責務" },
  { id: "C09", group: "記録", title: "訪問介護員の資格要件", detail: "身体介護を有資格者が提供しているか", basis: "訪問介護員等の資格" },
  { id: "C10", group: "記録", title: "訪問介護員の訪問重複", detail: "同じ職員が同じ時間帯に別の利用者を訪問していないか", basis: "勤務実態との整合" },
  { id: "C11", group: "記録", title: "訂正履歴", detail: "記録・報告書を訂正した場合に、訂正者・日時・理由が残っているか", basis: "記録の真正性" },
  { id: "C12", group: "記録", title: "異変時の報告記録", detail: "要観察などの状態変化があった場合に報告先が記録されているか", basis: "緊急時等の対応" },
  { id: "C13", group: "計画", title: "計画の同意前のサービス提供", detail: "訪問介護計画の説明・同意日より前にサービスを提供していないか", basis: "訪問介護計画の説明・同意・交付" },
  { id: "C14", group: "計画", title: "計画の記載事項", detail: "目標・具体的なサービス内容・作成者・同意日・交付日が記載されているか", basis: "訪問介護計画の作成" },
  { id: "C15", group: "計画", title: "ケアプランとの前後関係", detail: "訪問介護計画がケアプラン作成後に作成され、計画期間の開始前に同意を得ているか", basis: "居宅サービス計画に沿った訪問介護計画" },
  { id: "C16", group: "利用者", title: "要介護認定の有効期間", detail: "サービス提供日が要介護認定の有効期間内か", basis: "保険給付の対象期間" },
  { id: "C17", group: "利用者", title: "契約・重要事項説明", detail: "最初のサービス提供より前に契約（重要事項の説明・同意）をしているか", basis: "内容及び手続の説明及び同意" },
  { id: "C19", group: "利用者", title: "区分支給限度基準額", detail: "月の訪問介護の単位数が区分支給限度基準額を超えていないか（訪問看護など他サービスの分は含まない）", basis: "区分支給限度基準額の管理（超過分は利用者の全額負担）" },
  { id: "C18", group: "報告", title: "介護報告書の作成・送付", detail: "サービスを提供した月ごとに、介護報告書を確定しケアマネへ送付しているか", basis: "居宅介護支援事業者等との連携" },
];

export type TargetKind = "record" | "plan" | "report" | "user";
export type Finding = { checkId: string; kind: TargetKind; target: string; message: string };

export function runChecks(ds: Pick<Dataset, "records" | "users" | "staff" | "plans" | "reports">): Finding[] {
  const out: Finding[] = [];
  const add = (checkId: string, kind: TargetKind, target: string, message: string) => out.push({ checkId, kind, target, message });
  const userById = new Map(ds.users.map((u) => [u.id, u]));
  const staffById = new Map(ds.staff.map((s) => [s.id, s]));
  const staffName = (id: string) => staffById.get(id)?.name ?? id;

  for (const r of ds.records) {
    const rec = (id: string, msg: string) => add(id, "record", r.no, msg);
    const actualMin = toMin(r.end) - toMin(r.start);
    if (actualMin !== r.minutes) rec("C01", `提供分数 ${r.minutes}分 が開始・終了時刻（${actualMin}分）と一致しない`);

    const user = userById.get(r.userId);
    const plan = activePlan(ds.plans, r.userId, r.date);
    const service = matchService(plan, r);
    if (!plan) rec("C03", `${r.date} に有効な訪問介護計画がない`);
    else if (!service) rec("C03", `${weekdayOf(r.date)}曜 ${r.start} の訪問は計画（${plan.id}）にない`);
    else {
      const planned = classify(service.code, service.minutes, service.bodyMinutes);
      if (r.billingCode !== service.code) rec("C02", `計画は ${service.code}、記録の算定区分は ${r.billingCode}`);
      // 夜間・早朝・深夜の加算は、計画上のサービス開始時刻で判定する
      else if (planned && unitsWithTime(planned.units, service.start) !== r.units)
        rec("C02", `${service.code} の単位数は ${unitsWithTime(planned.units, service.start)}（時間帯の加算を含む）、記録は ${r.units}`);
      const actual = classify(service.code, actualMin, r.bodyMinutes ?? service.bodyMinutes);
      if (!actual) rec("C01", `実提供時間 ${actualMin}分 は算定できる時間に満たない`);
      else if (actual.code !== service.code) rec("C01", `実提供時間 ${actualMin}分 は ${actual.code} 相当（計画は ${service.code}）。乖離が続く場合は計画を見直す`);
    }
    if (plan && plan.agreedAt && r.date < plan.agreedAt) rec("C13", `計画の同意日（${plan.agreedAt}）より前の提供`);

    const isBody = r.billingCode.startsWith("身体");
    const isLife = r.billingCode.includes("生活");
    if (isBody && r.body.length === 0) rec("C05", "身体介護の区分だが身体介護の内容がない");
    if (isLife && r.life.length === 0) rec("C05", "生活援助を算定しているが生活援助の内容がない");
    if (!isLife && r.life.length > 0) rec("C05", `生活援助を算定していないのに生活援助（${r.life.join("・")}）が記録されている`);
    if (!isBody && r.body.length > 0) rec("C05", `生活援助の区分だが身体介護（${r.body.join("・")}）が記録されている`);

    if (r.note.trim().length < 20) rec("C06", "特記事項が短く、具体的な状態が読み取れない");
    if (!r.userConfirmed) rec("C07", "利用者確認がない");
    if (!r.supervisorCheckedBy) rec("C08", "サ責の確認がない");

    const st = staffById.get(r.staffId);
    if (!st) rec("C09", `担当職員（${r.staffId}）が職員名簿にない`);
    else if (r.body.length > 0 && !BODY_QUALIFIED.includes(st.qualification))
      rec("C09", `${st.name}（${st.qualification}）は身体介護の資格要件を満たさない`);

    for (const h of r.history) if (!h.reason.trim()) rec("C11", `「${h.field}」の訂正に理由がない`);
    if (r.condition !== "良好" && !r.reported) rec("C12", "状態に変化があるのに報告先の記録がない");

    if (!user) rec("C16", `利用者（${r.userId}）が利用者リストにない`);
    else if (!user.certFrom || !user.certTo) rec("C16", "利用者の認定有効期間が登録されていない");
    else if (r.date < user.certFrom || r.date > user.certTo) rec("C16", `認定有効期間（${user.certFrom}〜${user.certTo}）外の提供`);
  }

  for (const list of groupBy(ds.records, (r) => `${r.userId}|${r.date}`).values()) {
    const s = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < s.length; i++) {
      const gap = toMin(s[i].start) - toMin(s[i - 1].end);
      // 20分未満の身体介護（身体0）は2時間ルールの対象外
      if (s[i].billingCode === "身体0" || s[i - 1].billingCode === "身体0") continue;
      if (gap < TWO_HOUR_RULE_MIN) add("C04", "record", s[i].no, `前回訪問（${s[i - 1].no}、${s[i - 1].end}終了）から${gap}分。所要時間の合算が必要`);
    }
  }
  for (const list of groupBy(ds.records, (r) => `${r.staffId}|${r.date}`).values()) {
    const s = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < s.length; i++)
      if (toMin(s[i].start) < toMin(s[i - 1].end))
        add("C10", "record", s[i].no, `${staffName(s[i].staffId)}：${s[i - 1].no}（${s[i - 1].start}〜${s[i - 1].end}）と時間が重なっている`);
  }

  for (const p of ds.plans) {
    const miss = [
      !p.longGoal && "長期目標", p.shortGoals.length === 0 && "短期目標", p.services.length === 0 && "サービス内容",
      p.services.some((s) => !s.content) && "具体的な援助内容", !p.createdBy && "作成者", !p.agreedAt && "同意日", !p.deliveredAt && "交付日",
    ].filter(Boolean);
    if (miss.length) add("C14", "plan", p.id, `未記載：${miss.join("・")}`);
    if (p.carePlanDate && p.createdAt < p.carePlanDate) add("C15", "plan", p.id, `ケアプラン作成日（${p.carePlanDate}）より前に作成されている`);
    if (p.agreedAt && p.agreedAt > p.periodFrom) add("C15", "plan", p.id, `同意日（${p.agreedAt}）が計画期間の開始（${p.periodFrom}）より後`);
  }

  for (const u of ds.users) {
    const first = ds.records.filter((r) => r.userId === u.id).map((r) => r.date).sort()[0];
    if (!first) continue;
    if (!u.contractDate) add("C17", "user", u.id, "契約日が登録されていない");
    else if (u.contractDate > first) add("C17", "user", u.id, `契約日（${u.contractDate}）より前にサービスを提供（${first}）`);
  }

  const unitsByUserMonth = new Map<string, number>();
  for (const r of ds.records) unitsByUserMonth.set(`${r.userId}|${r.date.slice(0, 7)}`, (unitsByUserMonth.get(`${r.userId}|${r.date.slice(0, 7)}`) ?? 0) + r.units);
  for (const [key, units] of unitsByUserMonth) {
    const [userId, month] = key.split("|");
    const limit = userById.get(userId)?.limitUnits;
    if (limit && units > limit) add("C19", "user", userId, `${month}：訪問介護 ${units.toLocaleString("ja-JP")}単位が限度額 ${limit.toLocaleString("ja-JP")}単位を ${(units - limit).toLocaleString("ja-JP")}単位超えている`);
  }

  const months = new Set(ds.records.map((r) => `${r.userId}|${r.date.slice(0, 7)}`));
  for (const key of months) {
    const [userId, month] = key.split("|");
    const rep = ds.reports.find((x) => x.userId === userId && x.month === month);
    const name = userById.get(userId)?.name ?? userId;
    if (!rep) add("C18", "report", `${userId}-${month}`, `${name} ${month} の介護報告書がない`);
    else if (rep.status !== "確定") add("C18", "report", rep.id, `${name} ${month} の介護報告書が下書きのまま`);
    else if (!rep.sentAt) add("C18", "report", rep.id, `${name} ${month} の介護報告書がケアマネへ未送付`);
    if (rep) for (const h of rep.history) if (!h.reason.trim()) add("C11", "report", rep.id, `報告書「${h.field}」の訂正に理由がない`);
    if (rep?.finalizedAt && rep.finalizedAt.slice(0, 10) < monthRange(month).to) add("C18", "report", rep.id, "月末より前に確定している");
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
