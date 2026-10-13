/**
 * 介護報告書（ケアマネへの月次サービス実施状況報告）の下書き作成。
 * 訪問介護計画の目標・サービス内容と、当月のサービス提供記録から組み立てる。
 */
import { isChanged } from "./checks";
import { toMin } from "./format";
import { activePlan, monthRange, plannedSlots } from "./plan";
import type { CarePlan, CareRecord, CareReport, CareUser } from "./types";

export type ReportFacts = {
  plan: CarePlan | undefined;
  records: CareRecord[];
  slots: { code: string; weekday: string; start: string; planned: number; actual: number; content: string }[];
  observed: CareRecord[];
  totalMinutes: number;
};

export function reportFacts(user: CareUser, month: string, plans: CarePlan[], allRecords: CareRecord[]): ReportFacts {
  const { from, to } = monthRange(month);
  const records = allRecords.filter((r) => r.userId === user.id && r.date >= from && r.date <= to);
  const plan = activePlan(plans, user.id, to) ?? activePlan(plans, user.id, from);
  const planned = plannedSlots(plans, user.id, from, to);
  const key = (w: string, s: string, c: string) => `${w}|${s}|${c}`;
  const map = new Map<string, ReportFacts["slots"][number]>();
  for (const p of planned) {
    const k = key(p.service.weekday, p.service.start, p.service.code);
    const e = map.get(k) ?? { code: p.service.code, weekday: p.service.weekday, start: p.service.start, planned: 0, actual: 0, content: p.service.content };
    e.planned++;
    const hit = records.some((r) => r.date === p.date && Math.abs(toMin(r.start) - toMin(p.service.start)) <= 30);
    if (hit) e.actual++;
    map.set(k, e);
  }
  return {
    plan,
    records,
    slots: [...map.values()],
    observed: records.filter((r) => isChanged(r.condition) || r.reported),
    totalMinutes: records.reduce((s, r) => s + r.minutes, 0),
  };
}

export function draftReport(user: CareUser, month: string, plans: CarePlan[], records: CareRecord[], author: string, now: string): CareReport {
  const f = reportFacts(user, month, plans, records);
  const planned = f.slots.reduce((s, x) => s + x.planned, 0);
  const actual = f.records.length;
  const diff = planned - actual;
  const goals = f.plan ? [f.plan.longGoal, ...f.plan.shortGoals].filter(Boolean) : [];
  return {
    id: `${user.id}-${month}`,
    userId: user.id,
    month,
    planId: f.plan?.id ?? "",
    goalEvaluations: goals.map((goal) => ({ goal, rating: "継続", comment: "" })),
    serviceSummary:
      `計画上の予定 ${planned}回に対し、実施 ${actual}回（合計${Math.floor(f.totalMinutes / 60)}時間${f.totalMinutes % 60}分）。` +
      (diff === 0 ? "計画どおり実施した。" : diff > 0 ? `${diff}回は実施なし（理由を記載してください）。` : `計画外の訪問が${-diff}回あった（理由を記載してください）。`),
    condition: f.observed.length ? summarizeNotes(f.observed) : "当月、特段の状態変化はみられなかった。",
    issues: "",
    policy: "現行の訪問介護計画に沿って支援を継続する。",
    planChange: "不要",
    author,
    createdAt: now,
    status: "下書き",
    finalizedAt: null,
    sentTo: `${user.cmOffice} ${user.careManager}`.trim(),
    sentAt: null,
    history: [],
  };
}

/** 同じ内容の特記事項はまとめ、日付を並べる（例：・9/3、9/17 仙骨部に軽度発赤…） */
function summarizeNotes(records: CareRecord[]): string {
  const byNote = new Map<string, string[]>();
  for (const r of records) byNote.set(r.note, [...(byNote.get(r.note) ?? []), `${Number(r.date.slice(5, 7))}/${Number(r.date.slice(8))}`]);
  return [...byNote].map(([note, days]) => `・${days.join("、")} ${note}`).join("\n");
}
