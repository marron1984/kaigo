"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MonthSelect } from "@/components/MonthSelect";
import { PrintButton } from "@/components/PrintButton";
import { Badge, Card, Empty, PageTitle, Stat, td, th } from "@/components/ui";
import { downloadCSV } from "@/lib/csv";
import { localIso, slashDate, weekdayOf } from "@/lib/format";
import { jpMonth, nextMonth, shiftMonths } from "@/lib/months";
import { daysOf, monthRange } from "@/lib/plan";
import { DEFAULT_BUFFER, generateShift, staticReason, validateShift, visitsOf } from "@/lib/shift";
import { lookup, useData } from "@/lib/store";
import type { ShiftAssignment, ShiftPlan } from "@/lib/types";

const hm = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

export function ShiftsView({ month: m }: { month?: string }) {
  const { ds, saveShift } = useData();
  const L = lookup(ds);
  const month = m ?? nextMonth();
  const months = shiftMonths(ds.shifts.map((s) => s.month));
  const shift = ds.shifts.find((s) => s.month === month);
  const [tab, setTab] = useState<"grid" | "edit">("grid");
  const [buffer, setBuffer] = useState(shift?.bufferMinutes ?? DEFAULT_BUFFER);
  const visits = useMemo(() => visitsOf(ds.plans, ds.users, month), [ds.plans, ds.users, month]);
  const assignments = shift?.assignments ?? {};
  const check = useMemo(() => validateShift(visits, ds.staff, ds.users, assignments, shift?.bufferMinutes ?? buffer), [visits, ds.staff, ds.users, assignments, shift, buffer]);
  const days = daysOf(monthRange(month).from, monthRange(month).to);

  const generate = () => {
    if (shift && !confirm("固定していない割り当てを作り直します。よろしいですか？")) return;
    const res = generateShift(visits, ds.staff, ds.users, { buffer, keep: assignments });
    const now = localIso();
    saveShift({ month, assignments: res.assignments, bufferMinutes: buffer, generatedAt: now, updatedAt: now });
  };
  const setOne = (key: string, a: ShiftAssignment) =>
    shift && saveShift({ ...shift, assignments: { ...shift.assignments, [key]: a }, updatedAt: localIso() } satisfies ShiftPlan);

  const exportCSV = () =>
    downloadCSV(`シフト_${month}.csv`, [
      ["日付", "曜日", "開始", "終了", "利用者ID", "利用者名", "区分", "サービス内容", "担当職員ID", "担当職員", "固定", "確認事項"],
      ...visits.map((v) => {
        const a = assignments[v.key];
        return [v.date, weekdayOf(v.date), v.start, v.end, v.userId, L.user(v.userId)?.name, v.code, v.content, a?.staffId, L.staffName(a?.staffId ?? null), a?.locked ? "固定" : "", check.issues.get(v.key)];
      }),
    ]);

  const issues = shift ? check.issues.size : visits.length;
  return (
    <>
      <PageTitle title="シフト（訪問の担当割り当て）" sub={`${jpMonth(month)}　訪問予定 ${visits.length}件（訪問介護計画から作成）`}>
        <MonthSelect months={months} value={month} base="/shifts" />
        {shift && <PrintButton label="シフト表を印刷" />}
        {shift && <button onClick={exportCSV} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm">CSV出力</button>}
      </PageTitle>
      <h1 className="mb-2 hidden font-bold print:block">シフト表　{jpMonth(month)}　{ds.office.name}</h1>

      <Card className="no-print mb-4 flex flex-wrap items-end gap-4 text-sm">
        <label className="text-xs text-slate-600">
          訪問の間に空ける移動時間（分）
          <input type="number" min={0} max={90} step={5} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} className="mt-1 block w-24 rounded border border-slate-300 px-2 py-1.5" />
        </label>
        <button onClick={generate} disabled={visits.length === 0 || ds.staff.length === 0} className="rounded bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-40">
          {shift ? "自動で作り直す（固定は残す）" : "シフトを自動作成"}
        </button>
        <p className="text-xs text-slate-500">
          資格（身体介護は有資格者）・勤務可能時間・担当しない利用者・週の上限時間・移動時間を守って割り当てます。同じ曜日・時間の枠は月を通して同じ職員にそろえます。
          {shift && `　作成 ${shift.generatedAt.replace("T", " ")}／更新 ${shift.updatedAt.replace("T", " ")}／移動時間 ${shift.bufferMinutes}分`}
        </p>
      </Card>

      {visits.length === 0 ? (
        <Empty>{jpMonth(month)}に有効な訪問介護計画がありません。<Link href="/import" className="ml-1 underline">計画を取り込む</Link></Empty>
      ) : ds.staff.length === 0 ? (
        <Empty>職員が登録されていません。<Link href="/import" className="ml-1 underline">職員を取り込む</Link></Empty>
      ) : !shift ? (
        <Empty>まだシフトがありません。「シフトを自動作成」を押してください。</Empty>
      ) : (
        <>
          <div className="no-print mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="訪問予定" value={`${visits.length}件`} />
            <Stat label="担当決定" value={`${visits.filter((v) => assignments[v.key]?.staffId).length}件`} />
            <Stat label="要対応（未定・条件違反）" value={`${issues}件`} />
            <Stat label="固定した割り当て" value={`${Object.values(assignments).filter((a) => a.locked).length}件`} />
          </div>

          <Card className="mb-4 overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead><tr>{["職員", "資格", "雇用", "担当件数", "訪問時間（月）", "週の最大／上限", "担当利用者", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {ds.staff.map((s) => {
                  const t = check.totals.get(s.id);
                  const maxWeek = Math.max(0, ...(t ? [...t.weeks.values()] : [0]));
                  const usersOf = [...new Set(visits.filter((v) => assignments[v.key]?.staffId === s.id).map((v) => L.user(v.userId)?.name ?? v.userId))];
                  return (
                    <tr key={s.id}>
                      <td className={`${td} whitespace-nowrap font-medium`}>{s.name}</td>
                      <td className={`${td} text-xs`}>{s.qualification}</td>
                      <td className={`${td} text-xs`}>{s.employment ?? "―"}</td>
                      <td className={`${td} tabular-nums`}>{t?.visits ?? 0}件</td>
                      <td className={`${td} tabular-nums`}>{hm(t?.minutes ?? 0)}</td>
                      <td className={`${td} tabular-nums ${s.maxWeeklyMinutes && maxWeek > s.maxWeeklyMinutes ? "text-red-700" : ""}`}>{hm(maxWeek)}／{s.maxWeeklyMinutes ? hm(s.maxWeeklyMinutes) : "なし"}</td>
                      <td className={`${td} text-xs`}>{usersOf.join("、")}</td>
                      <td className={`${td} no-print`}><Link href={`/shifts/${s.id}?month=${month}`} className="text-teal-700 underline">個人別</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <div className="no-print mb-3 flex gap-1 text-sm">
            {(["grid", "edit"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 ${tab === t ? "bg-teal-700 text-white" : "border border-slate-300 bg-white"}`}>
                {t === "grid" ? "全体表（職員×日）" : `日別の割り当て・変更${issues ? `（要対応 ${issues}）` : ""}`}
              </button>
            ))}
          </div>

          {tab === "grid" ? (
            <Card className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-[10px] leading-tight">
                <thead>
                  <tr>
                    <th className="sticky left-0 border border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs">職員</th>
                    {days.map((d) => (
                      <th key={d} className={`min-w-[52px] border border-slate-200 px-0.5 py-1 font-normal ${["土", "日"].includes(weekdayOf(d)) ? "bg-rose-50" : "bg-slate-50"}`}>
                        {Number(d.slice(8))}<br />{weekdayOf(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...ds.staff.map((s) => ({ id: s.id as string | null, name: s.name })), { id: null, name: "未定" }].map((row) => {
                    const mine = visits.filter((v) => (assignments[v.key]?.staffId ?? null) === row.id);
                    if (row.id === null && mine.length === 0) return null;
                    return (
                      <tr key={row.id ?? "none"}>
                        <td className={`sticky left-0 whitespace-nowrap border border-slate-200 bg-white px-2 text-xs ${row.id ? "" : "font-bold text-red-700"}`}>{row.name}</td>
                        {days.map((d) => (
                          <td key={d} className="border border-slate-200 px-0.5 py-0.5 align-top">
                            {mine.filter((v) => v.date === d).map((v) => (
                              <div key={v.key} className={check.issues.has(v.key) ? "text-red-700" : ""} title={`${v.start}〜${v.end} ${L.user(v.userId)?.name} ${v.code}`}>
                                {v.start} {(L.user(v.userId)?.name ?? v.userId).split(/\s/)[0]}
                              </div>
                            ))}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ) : (
            <div className="space-y-3">
              {days.map((d) => {
                const vs = visits.filter((v) => v.date === d);
                if (vs.length === 0) return null;
                return (
                  <Card key={d} className="overflow-x-auto p-0">
                    <h3 className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold">{slashDate(d)}（{weekdayOf(d)}）</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {vs.map((v) => {
                          const a = assignments[v.key] ?? { staffId: null, locked: false };
                          const issue = check.issues.get(v.key);
                          return (
                            <tr key={v.key}>
                              <td className={`${td} w-28 whitespace-nowrap tabular-nums`}>{v.start}〜{v.end}</td>
                              <td className={`${td} w-32 whitespace-nowrap`}>{L.user(v.userId)?.name ?? v.userId}</td>
                              <td className={`${td} w-24 whitespace-nowrap text-xs`}>{v.code}</td>
                              <td className={`${td} text-xs text-slate-600`}>{v.content}</td>
                              <td className={`${td} w-48`}>
                                <select
                                  value={a.staffId ?? ""}
                                  onChange={(e) => setOne(v.key, { staffId: e.target.value || null, locked: true })}
                                  className={`w-full rounded border px-2 py-1 text-sm ${issue ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                                >
                                  <option value="">未定</option>
                                  {ds.staff.map((s) => {
                                    const r = staticReason(s, v, L.user(v.userId));
                                    return <option key={s.id} value={s.id}>{s.name}{r ? `（${r}）` : ""}</option>;
                                  })}
                                </select>
                              </td>
                              <td className={`${td} w-16 whitespace-nowrap text-xs`}>
                                <label><input type="checkbox" checked={a.locked} onChange={(e) => setOne(v.key, { ...a, locked: e.target.checked })} /> 固定</label>
                              </td>
                              <td className={`${td} w-44 text-xs`}>{issue ? <span className="text-red-700">{issue}</span> : <Badge ok>OK</Badge>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            手で担当を変えると自動で「固定」になり、作り直しても残ります。移動時間は一律の設定です（住所による移動時間の計算はしていません）。
            運営指導で使う勤務形態一覧表には、訪問時間に加えて移動・記録・事務の時間を含めた勤務時間が必要です。
          </p>
        </>
      )}
    </>
  );
}
