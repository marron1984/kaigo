/**
 * 訪問介護計画と職員の勤務条件から、月間のシフト（訪問の担当割り当て）を作る。
 *
 * 方針
 * - 資格（身体介護は有資格者）・勤務可能時間・担当しない利用者は必ず守る
 * - 同じ職員の訪問は、移動時間（bufferMinutes）を空けて重ならないようにする
 * - 週の上限時間を超えない
 * - 同じ曜日・時間のサービス枠は、できるだけ月を通して同じ職員が担当する（担当の固定）
 * - 担当希望の利用者、すでに担当している利用者を優先し、残りは負担が少ない職員に寄せる
 */
import { parseDate, toMin, fromMin, ymd } from "./format";
import { BODY_QUALIFIED } from "./master";
import { monthRange, plannedSlots } from "./plan";
import type { CarePlan, CareUser, ShiftAssignment, Staff, Visit } from "./types";

export const DEFAULT_BUFFER = 15;

export function visitsOf(plans: CarePlan[], users: CareUser[], month: string): Visit[] {
  const { from, to } = monthRange(month);
  const out: Visit[] = [];
  for (const u of users) {
    for (const s of plannedSlots(plans, u.id, from, to)) {
      out.push({
        key: `${s.date}|${u.id}|${s.service.start}`,
        date: s.date,
        userId: u.id,
        start: s.service.start,
        end: fromMin(toMin(s.service.start) + s.service.minutes),
        minutes: s.service.minutes,
        code: s.service.code,
        planId: s.plan.id,
        content: s.service.content,
        caution: s.service.caution,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.userId.localeCompare(b.userId));
}

/** 月曜始まりの週のキー */
export function weekKey(date: string): string {
  const d = parseDate(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
}

const WD = ["日", "月", "火", "水", "木", "金", "土"] as const;

function matchesUser(list: string[] | undefined, u: CareUser | undefined): boolean {
  if (!list?.length || !u) return false;
  const name = u.name.replace(/\s/g, "");
  return list.some((x) => x === u.id || x.replace(/\s/g, "") === name);
}

/** 訪問の時刻と無関係に決まる条件（資格・勤務可能時間・担当しない利用者） */
export function staticReason(s: Staff, v: Visit, user: CareUser | undefined): string | null {
  if (v.code.startsWith("身体") && !BODY_QUALIFIED.includes(s.qualification)) return "資格要件（身体介護不可）";
  if (s.availability) {
    const ranges = s.availability[WD[parseDate(v.date).getDay()]];
    if (!ranges?.some((r) => toMin(r.from) <= toMin(v.start) && toMin(v.end) <= toMin(r.to))) return "勤務可能時間外";
  }
  if (matchesUser(s.ngUsers, user)) return "担当しない利用者";
  return null;
}

type Load = { byDate: Map<string, Visit[]>; byWeek: Map<string, number>; total: number; users: Set<string> };

function emptyLoad(): Load {
  return { byDate: new Map(), byWeek: new Map(), total: 0, users: new Set() };
}

function dynamicReason(s: Staff, load: Load, v: Visit, buffer: number): string | null {
  const st = toMin(v.start);
  const en = toMin(v.end);
  for (const o of load.byDate.get(v.date) ?? []) {
    if (st < toMin(o.end) + buffer && toMin(o.start) < en + buffer) return `他の訪問と重複（移動${buffer}分を含む）`;
  }
  if (s.maxWeeklyMinutes && (load.byWeek.get(weekKey(v.date)) ?? 0) + v.minutes > s.maxWeeklyMinutes) return "週の上限時間を超える";
  return null;
}

function add(load: Load, v: Visit) {
  load.byDate.set(v.date, [...(load.byDate.get(v.date) ?? []), v]);
  load.byWeek.set(weekKey(v.date), (load.byWeek.get(weekKey(v.date)) ?? 0) + v.minutes);
  load.total += v.minutes;
  load.users.add(v.userId);
}

export type ShiftResult = {
  assignments: Record<string, ShiftAssignment>;
  /** 割り当てられなかった訪問と、その理由 */
  unassigned: { key: string; reason: string }[];
};

export function generateShift(
  visits: Visit[],
  staff: Staff[],
  users: CareUser[],
  opts: { buffer?: number; keep?: Record<string, ShiftAssignment> } = {},
): ShiftResult {
  const buffer = opts.buffer ?? DEFAULT_BUFFER;
  const userById = new Map(users.map((u) => [u.id, u]));
  const loads = new Map(staff.map((s) => [s.id, emptyLoad()]));
  const assignments: Record<string, ShiftAssignment> = {};

  // 固定（locked）の割り当てを先に反映
  for (const v of visits) {
    const k = opts.keep?.[v.key];
    if (k?.locked) {
      assignments[v.key] = k;
      if (k.staffId && loads.has(k.staffId)) add(loads.get(k.staffId)!, v);
    }
  }

  const open = visits.filter((v) => !assignments[v.key]);
  const eligible = (v: Visit) => staff.filter((s) => !staticReason(s, v, userById.get(v.userId)));
  const score = (s: Staff, v: Visit) => {
    const l = loads.get(s.id)!;
    const cap = s.maxWeeklyMinutes ? s.maxWeeklyMinutes * 4.4 : 160 * 60;
    let sc = l.total / cap;
    if (matchesUser(s.preferredUsers, userById.get(v.userId))) sc -= 1;
    if (l.users.has(v.userId)) sc -= 0.3;
    return sc;
  };
  const rank = (cands: Staff[], v: Visit) => [...cands].sort((a, b) => score(a, v) - score(b, v) || a.id.localeCompare(b.id));

  // 同じ計画の同じ曜日・時間の枠をまとめ、候補が少ない枠から決める
  const groups = new Map<string, Visit[]>();
  for (const v of open) {
    const g = `${v.planId}|${parseDate(v.date).getDay()}|${v.start}|${v.code}`;
    groups.set(g, [...(groups.get(g) ?? []), v]);
  }
  const ordered = [...groups.values()].sort(
    (a, b) => eligible(a[0]).length - eligible(b[0]).length || a[0].start.localeCompare(b[0].start) || a[0].userId.localeCompare(b[0].userId),
  );

  const unassigned: ShiftResult["unassigned"] = [];
  for (const group of ordered) {
    const cands = rank(eligible(group[0]), group[0]);
    // 月を通して同じ職員が担当できるか
    const whole = cands.find((s) => {
      const trial = cloneLoad(loads.get(s.id)!);
      return group.every((v) => {
        if (staticReason(s, v, userById.get(v.userId)) || dynamicReason(s, trial, v, buffer)) return false;
        add(trial, v);
        return true;
      });
    });
    if (whole) {
      for (const v of group) {
        assignments[v.key] = { staffId: whole.id, locked: false };
        add(loads.get(whole.id)!, v);
      }
      continue;
    }
    // できなければ1回ずつ割り当てる
    for (const v of group) {
      const reasons: string[] = [];
      const pick = rank(staff, v).find((s) => {
        const r = staticReason(s, v, userById.get(v.userId)) ?? dynamicReason(s, loads.get(s.id)!, v, buffer);
        if (r) reasons.push(r);
        return !r;
      });
      if (pick) {
        assignments[v.key] = { staffId: pick.id, locked: false };
        add(loads.get(pick.id)!, v);
      } else {
        assignments[v.key] = { staffId: null, locked: false };
        unassigned.push({ key: v.key, reason: summarize(reasons, staff.length) });
      }
    }
  }
  return { assignments, unassigned };
}

function cloneLoad(l: Load): Load {
  return { byDate: new Map([...l.byDate].map(([k, v]) => [k, [...v]])), byWeek: new Map(l.byWeek), total: l.total, users: new Set(l.users) };
}

function summarize(reasons: string[], n: number): string {
  if (n === 0) return "職員が登録されていない";
  const count = new Map<string, number>();
  for (const r of reasons) count.set(r, (count.get(r) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).map(([r, c]) => `${r}（${c}名）`).join("、");
}

/** 現在の割り当てが条件を満たしているか（手で変更した割り当ての確認用） */
export function validateShift(visits: Visit[], staff: Staff[], users: CareUser[], assignments: Record<string, ShiftAssignment>, buffer: number) {
  const userById = new Map(users.map((u) => [u.id, u]));
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const loads = new Map(staff.map((s) => [s.id, emptyLoad()]));
  const issues = new Map<string, string>();
  for (const v of visits) {
    const a = assignments[v.key];
    if (!a?.staffId) {
      issues.set(v.key, "担当者が未定");
      continue;
    }
    const s = staffById.get(a.staffId);
    if (!s) {
      issues.set(v.key, "担当者が職員名簿にない");
      continue;
    }
    const r = staticReason(s, v, userById.get(v.userId)) ?? dynamicReason(s, loads.get(s.id)!, v, buffer);
    if (r) issues.set(v.key, r);
    add(loads.get(s.id)!, v);
  }
  const totals = new Map([...loads].map(([id, l]) => [id, { minutes: l.total, visits: [...l.byDate.values()].flat().length, weeks: l.byWeek }]));
  return { issues, totals };
}

/** 職員ごとに、担当できる訪問かどうかと理由（手動変更の候補表示用） */
export function candidateNote(s: Staff, v: Visit, user: CareUser | undefined): string | null {
  return staticReason(s, v, user);
}
