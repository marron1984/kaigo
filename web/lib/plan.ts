import { parseDate, toMin, weekdayOf, ymd } from "./format";
import type { CarePlan, CareRecord, PlanService } from "./types";

/** その日に有効な訪問介護計画 */
export function activePlan(plans: CarePlan[], userId: string, date: string): CarePlan | undefined {
  return plans
    .filter((p) => p.userId === userId && p.periodFrom <= date && date <= p.periodTo)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** 記録に対応する計画のサービス枠（同じ曜日で開始時刻の差が30分以内） */
export function matchService(plan: CarePlan | undefined, r: Pick<CareRecord, "date" | "start">): PlanService | undefined {
  return plan?.services.find((s) => s.weekday === weekdayOf(r.date) && Math.abs(toMin(s.start) - toMin(r.start)) <= 30);
}

export function daysOf(from: string, to: string): string[] {
  const out: string[] = [];
  for (const d = parseDate(from); ymd(d) <= to; d.setDate(d.getDate() + 1)) out.push(ymd(d));
  return out;
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  return { from: `${month}-01`, to: ymd(new Date(y, m, 0)) };
}

/** 期間内の計画上の予定回数（計画期間と重なる日だけ数える） */
export function plannedSlots(plans: CarePlan[], userId: string, from: string, to: string) {
  const slots: { date: string; plan: CarePlan; service: PlanService }[] = [];
  for (const date of daysOf(from, to)) {
    const plan = activePlan(plans, userId, date);
    if (!plan) continue;
    for (const service of plan.services.filter((s) => s.weekday === weekdayOf(date))) slots.push({ date, plan, service });
  }
  return slots;
}
