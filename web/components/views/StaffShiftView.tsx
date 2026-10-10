"use client";

import Link from "next/link";
import { MonthSelect } from "@/components/MonthSelect";
import { PrintButton } from "@/components/PrintButton";
import { Empty, NotFound } from "@/components/ui";
import { slashDate, weekdayOf } from "@/lib/format";
import { jpMonth, nextMonth, shiftMonths } from "@/lib/months";
import { visitsOf } from "@/lib/shift";
import { lookup, useData } from "@/lib/store";

const L0 = "border border-slate-800 bg-slate-100 px-2 py-1 text-center font-semibold whitespace-nowrap";
const V = "border border-slate-800 px-2 py-1 align-top";

/** 職員個人の月間訪問予定（本人に渡す用・A4縦） */
export function StaffShiftView({ staffId, month: m }: { staffId: string; month?: string }) {
  const { ds } = useData();
  const L = lookup(ds);
  const s = L.staff(staffId);
  if (!s) return <NotFound what="職員" />;
  const month = m ?? nextMonth();
  const shift = ds.shifts.find((x) => x.month === month);
  const mine = visitsOf(ds.plans, ds.users, month).filter((v) => shift?.assignments[v.key]?.staffId === s.id);
  const total = mine.reduce((a, v) => a + v.minutes, 0);
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/shifts?month=${month}`} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">← シフト全体</Link>
        <MonthSelect months={shiftMonths(ds.shifts.map((x) => x.month))} value={month} base={`/shifts/${s.id}`} />
        <PrintButton label="この予定表を印刷" />
      </div>
      {!shift ? <Empty>{jpMonth(month)}のシフトはまだ作成されていません。</Empty> : (
        <article className="sheet mx-auto w-full max-w-[190mm] bg-white p-6 text-[12px] shadow print:p-0">
          <h1 className="text-center text-lg font-bold tracking-widest">訪問予定表　{jpMonth(month)}</h1>
          <div className="mt-1 flex justify-between text-[11px]">
            <span>{s.name}（{s.qualification}）</span>
            <span>{ds.office.corp}　{ds.office.name}</span>
          </div>
          {ds.source === "mock" && <div className="text-[10px] text-red-700">※架空のモックデータ</div>}
          <table className="mt-2 w-full border-collapse">
            <thead><tr><th className={L0}>日付</th><th className={L0}>時間</th><th className={L0}>利用者</th><th className={L0}>区分</th><th className={L0}>サービス内容・留意事項</th></tr></thead>
            <tbody>
              {mine.map((v) => (
                <tr key={v.key}>
                  <td className={`${V} whitespace-nowrap`}>{slashDate(v.date).slice(5)}（{weekdayOf(v.date)}）</td>
                  <td className={`${V} whitespace-nowrap`}>{v.start}〜{v.end}</td>
                  <td className={`${V} whitespace-nowrap`}>{L.user(v.userId)?.name ?? v.userId} 様</td>
                  <td className={`${V} whitespace-nowrap`}>{v.code}</td>
                  <td className={V}>{v.content}{v.caution && <div className="text-[10px] text-slate-600">留意：{v.caution}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-right">訪問 {mine.length}件／合計 {Math.floor(total / 60)}時間{total % 60}分</p>
        </article>
      )}
    </>
  );
}
