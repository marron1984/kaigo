"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PrintButton } from "@/components/PrintButton";
import { Badge, Card, NotFound, input, td, th } from "@/components/ui";
import { CHECKS } from "@/lib/checks";
import { dateTime, jpDate, localIso, ymd } from "@/lib/format";
import { jpMonth } from "@/lib/months";
import { draftReport, reportFacts } from "@/lib/report";
import { useData } from "@/lib/store";
import type { CareReport, GoalRating, HistoryEntry } from "@/lib/types";

const RATINGS: GoalRating[] = ["達成", "一部達成", "未達成", "継続"];
const L = "border border-slate-800 bg-slate-100 px-2 py-1.5 text-center font-semibold whitespace-nowrap align-middle";
const V = "border border-slate-800 px-2 py-1.5 align-top whitespace-pre-wrap";
const nowIso = () => localIso();

const FIELDS: { key: "serviceSummary" | "condition" | "issues" | "policy"; label: string }[] = [
  { key: "serviceSummary", label: "サービスの実施状況" },
  { key: "condition", label: "心身の状況・変化" },
  { key: "issues", label: "課題" },
  { key: "policy", label: "今後の方針" },
];

export function ReportView({ id }: { id: string }) {
  const { ds, findings, saveReport } = useData();
  const month = id.slice(-7);
  const userId = id.slice(0, -8);
  const user = ds.users.find((u) => u.id === userId);
  const saved = ds.reports.find((r) => r.id === id);
  const [draft, setDraft] = useState<CareReport | null>(saved ?? null);
  const [mode, setMode] = useState<"view" | "edit" | "correct">(saved?.status === "確定" ? "view" : "edit");
  const [reason, setReason] = useState("");
  const [sentDate, setSentDate] = useState(ymd(new Date()));
  useEffect(() => setDraft(saved ?? null), [saved]);

  if (!user || !/^\d{4}-\d{2}$/.test(month)) return <NotFound what="介護報告書" />;
  const facts = reportFacts(user, month, ds.plans, ds.records);
  const author = ds.staff.find((s) => s.role === "サービス提供責任者")?.name ?? facts.plan?.createdBy ?? "";
  const fs = findings.filter((f) => f.kind === "report" && f.target === id);

  if (!draft)
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 text-lg font-bold">{user.name} 様　{jpMonth(month)}の介護報告書</h1>
        <p className="mb-4 text-sm text-slate-600">
          訪問介護計画（{facts.plan?.id ?? "なし"}）と当月の記録{facts.records.length}件から下書きを作成します。
        </p>
        <button className="rounded bg-teal-700 px-4 py-2 text-sm font-medium text-white" onClick={() => saveReport(draftReport(user, month, ds.plans, ds.records, author, nowIso()))}>
          下書きを作成する
        </button>
      </Card>
    );

  const editable = mode !== "view";
  const set = (patch: Partial<CareReport>) => setDraft({ ...draft, ...patch });

  const save = () => {
    if (mode === "correct") {
      if (!reason.trim()) return alert("確定後の訂正には理由が必要です");
      const before = saved!;
      const changes: HistoryEntry[] = [];
      const at = nowIso();
      for (const f of FIELDS) if (before[f.key] !== draft[f.key]) changes.push({ at, by: author, field: f.label, before: before[f.key], after: draft[f.key], reason });
      draft.goalEvaluations.forEach((g, i) => {
        const b = before.goalEvaluations[i];
        if (b && (b.rating !== g.rating || b.comment !== g.comment))
          changes.push({ at, by: author, field: `目標${i + 1}の評価`, before: `${b.rating}：${b.comment}`, after: `${g.rating}：${g.comment}`, reason });
      });
      if (before.planChange !== draft.planChange) changes.push({ at, by: author, field: "計画変更の必要性", before: before.planChange, after: draft.planChange, reason });
      if (changes.length === 0) return setMode("view");
      saveReport({ ...draft, history: [...before.history, ...changes] });
      setReason("");
    } else saveReport(draft);
    if (mode === "correct") setMode("view");
  };

  const finalize = () => {
    if (draft.goalEvaluations.some((g) => !g.comment.trim())) return alert("すべての目標に評価のコメントを記入してください");
    if (!confirm("確定すると、以後の変更は訂正履歴（理由つき）として残ります。確定しますか？")) return;
    saveReport({ ...draft, status: "確定", finalizedAt: nowIso() });
    setMode("view");
  };

  return (
    <div className="print-block grid gap-4 lg:grid-cols-[1fr_300px]">
      <article className="sheet mx-auto w-full max-w-[190mm] bg-white p-6 text-[12px] leading-relaxed shadow print:p-0">
        <h1 className="text-center text-lg font-bold tracking-widest">介護報告書（訪問介護実施状況報告）</h1>
        <div className="mt-1 flex justify-between text-[11px]">
          <span>{draft.sentTo} 様</span>
          <span>{ds.office.corp}　{ds.office.name}</span>
        </div>
        {ds.source === "mock" && <div className="text-[10px] text-red-700">※架空のモックデータ</div>}
        <table className="mt-2 w-full border-collapse">
          <tbody>
            <tr>
              <td className={L}>利用者名</td><td className={V}>{user.name} 様</td>
              <td className={L}>要介護度</td><td className={V}>{user.careLevel}</td>
            </tr>
            <tr>
              <td className={L}>対象月</td><td className={V}>{jpMonth(month)}</td>
              <td className={L}>根拠の計画</td><td className={V}>{facts.plan ? `${facts.plan.id}（${facts.plan.periodFrom}〜${facts.plan.periodTo}）` : "なし"}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 border border-b-0 border-slate-800 bg-sky-100 px-2 py-1 font-semibold">■ 計画に対する実施回数</div>
        <table className="w-full border-collapse">
          <thead><tr><th className={L}>曜日・時間</th><th className={L}>区分</th><th className={L}>サービス内容</th><th className={L}>予定</th><th className={L}>実績</th></tr></thead>
          <tbody>
            {facts.slots.map((s, i) => (
              <tr key={i}>
                <td className={`${V} whitespace-nowrap`}>{s.weekday} {s.start}〜</td>
                <td className={`${V} whitespace-nowrap`}>{s.code}</td>
                <td className={V}>{s.content}</td>
                <td className={`${V} text-center`}>{s.planned}</td>
                <td className={`${V} text-center ${s.actual !== s.planned ? "font-bold text-red-700" : ""}`}>{s.actual}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 border border-b-0 border-slate-800 bg-sky-100 px-2 py-1 font-semibold">■ 目標の達成状況</div>
        <table className="w-full border-collapse">
          <thead><tr><th className={L}>目標</th><th className={L}>評価</th><th className={L}>所見</th></tr></thead>
          <tbody>
            {draft.goalEvaluations.map((g, i) => (
              <tr key={i}>
                <td className={`${V} w-[35%]`}><span className="text-[10px] text-slate-500">{i === 0 ? "長期" : `短期${i}`}</span><br />{g.goal}</td>
                <td className={`${V} w-[14%] text-center`}>
                  {editable ? (
                    <select className={`${input} no-print`} value={g.rating} onChange={(e) => set({ goalEvaluations: draft.goalEvaluations.map((x, k) => (k === i ? { ...x, rating: e.target.value as GoalRating } : x)) })}>
                      {RATINGS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  ) : g.rating}
                  {editable && <span className="hidden print:inline">{g.rating}</span>}
                </td>
                <td className={V}>
                  {editable ? (
                    <textarea rows={2} className={`${input} no-print`} value={g.comment} onChange={(e) => set({ goalEvaluations: draft.goalEvaluations.map((x, k) => (k === i ? { ...x, comment: e.target.value } : x)) })} />
                  ) : g.comment}
                  {editable && <span className="hidden print:inline">{g.comment}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse">
          <tbody>
            {FIELDS.map((f) => (
              <tr key={f.key}>
                <td className={`${L} w-[22%]`}>{f.label}</td>
                <td className={V}>
                  {editable ? <textarea rows={f.key === "condition" ? 5 : 3} className={`${input} no-print`} value={draft[f.key]} onChange={(e) => set({ [f.key]: e.target.value })} /> : draft[f.key]}
                  {editable && <span className="hidden print:inline">{draft[f.key]}</span>}
                </td>
              </tr>
            ))}
            <tr>
              <td className={L}>計画変更の必要性</td>
              <td className={V}>
                {editable ? (
                  <select className={`${input} no-print w-auto`} value={draft.planChange} onChange={(e) => set({ planChange: e.target.value as CareReport["planChange"] })}>
                    {["不要", "要検討", "必要"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                ) : draft.planChange}
                {editable && <span className="hidden print:inline">{draft.planChange}</span>}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse">
          <tbody>
            <tr>
              <td className={L}>作成者（サ責）</td><td className={V}>{draft.author}</td>
              <td className={L}>作成日</td><td className={V}>{jpDate(draft.createdAt.slice(0, 10))}</td>
            </tr>
            <tr>
              <td className={L}>確定日</td><td className={V}>{draft.finalizedAt ? jpDate(draft.finalizedAt.slice(0, 10)) : "下書き"}</td>
              <td className={L}>送付日</td><td className={V}>{draft.sentAt ? jpDate(draft.sentAt.slice(0, 10)) : "未送付"}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <aside className="no-print space-y-4">
        <div className="flex flex-wrap gap-2">
          <PrintButton label="報告書を印刷" />
          <Link href={`/reports?month=${month}`} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">一覧へ</Link>
        </div>
        <Card className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">状態</h2>
            <Badge ok={draft.status === "確定"}>{draft.status}</Badge>
          </div>
          {draft.status === "下書き" && (
            <>
              <button onClick={save} className="w-full rounded border border-teal-700 px-3 py-2 text-teal-800">下書きを保存</button>
              <button onClick={finalize} className="w-full rounded bg-teal-700 px-3 py-2 font-medium text-white">確定する</button>
              <button onClick={() => confirm("計画と記録から下書きを作り直します。入力した内容は消えます。よろしいですか？") && saveReport(draftReport(user, month, ds.plans, ds.records, author, nowIso()))} className="w-full text-xs text-slate-500 underline">
                計画と記録から作り直す
              </button>
            </>
          )}
          {draft.status === "確定" && mode === "view" && (
            <>
              {!draft.sentAt && (
                <div className="space-y-2 rounded bg-amber-50 p-2">
                  <label className="block text-xs">送付日<input type="date" className={input} value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></label>
                  <button onClick={() => saveReport({ ...draft, sentAt: `${sentDate}T00:00` })} className="w-full rounded bg-teal-700 px-3 py-2 font-medium text-white">ケアマネへ送付済みにする</button>
                </div>
              )}
              <button onClick={() => setMode("correct")} className="w-full rounded border border-slate-300 px-3 py-2">訂正する（理由が必要）</button>
            </>
          )}
          {mode === "correct" && (
            <div className="space-y-2 rounded bg-sky-50 p-2">
              <label className="block text-xs">訂正の理由<textarea rows={2} className={input} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
              <button onClick={save} className="w-full rounded bg-teal-700 px-3 py-2 font-medium text-white">訂正を保存</button>
              <button onClick={() => { setDraft(saved ?? null); setMode("view"); }} className="w-full text-xs text-slate-500 underline">やめる</button>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">自動チェック</h2>
          {fs.length === 0 ? <Badge ok>指摘なし</Badge> : <ul className="list-disc pl-4 text-sm text-red-700">{fs.map((f, k) => <li key={k}>{CHECKS.find((c) => c.id === f.checkId)?.title}：{f.message}</li>)}</ul>}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">当月の状態変化・報告（記録より）</h2>
          {facts.observed.length === 0 ? <p className="text-sm text-slate-500">なし</p> : (
            <ul className="space-y-1 text-xs">{facts.observed.map((r) => <li key={r.no}><Link href={`/records/${r.no}`} className="text-teal-700 underline">{r.date.slice(5)}</Link> {r.note}</li>)}</ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">訂正履歴</h2>
          {draft.history.length === 0 ? <p className="text-sm text-slate-500">訂正はありません。</p> : (
            <table className="w-full text-xs">
              <thead><tr><th className={th}>日時・訂正者</th><th className={th}>内容</th></tr></thead>
              <tbody>
                {draft.history.map((h, k) => (
                  <tr key={k}>
                    <td className={`${td} whitespace-nowrap`}>{dateTime(h.at)}<br />{h.by}</td>
                    <td className={td}><div className="font-medium">{h.field}</div><div className="line-through">{h.before}</div><div>{h.after}</div><div className="mt-1 text-slate-600">理由：{h.reason}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </aside>
    </div>
  );
}
