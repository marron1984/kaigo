"use client";

import Link from "next/link";
import { MonthSelect } from "@/components/MonthSelect";
import { PrintButton } from "@/components/PrintButton";
import { PageTitle, td, th } from "@/components/ui";
import { yenOf } from "@/lib/billing";
import { yen } from "@/lib/format";
import { UNIT_PRICE } from "@/lib/master";
import { jpMonth, monthsOf } from "@/lib/months";
import { useData } from "@/lib/store";

export function SummaryView({ month: m }: { month?: string }) {
  const { ds } = useData();
  const months = monthsOf(ds);
  const month = m ?? months[0] ?? "";
  const records = ds.records.filter((r) => r.date.startsWith(month));
  const rows = ds.users
    .map((u) => {
      const rs = records.filter((r) => r.userId === u.id);
      const byCode = new Map<string, number>();
      for (const r of rs) byCode.set(r.billingCode, (byCode.get(r.billingCode) ?? 0) + 1);
      return {
        u, count: rs.length, minutes: rs.reduce((s, r) => s + r.minutes, 0), units: rs.reduce((s, r) => s + r.units, 0),
        amount: rs.reduce((s, r) => s + yenOf(r.units, UNIT_PRICE), 0), byCode: [...byCode].map(([c, n]) => `${c}×${n}`).join("、"),
      };
    })
    .filter((r) => r.count > 0);
  const total = (k: "count" | "minutes" | "units" | "amount") => rows.reduce((s, r) => s + r[k], 0);
  const hm = (n: number) => `${Math.floor(n / 60)}時間${n % 60}分`;
  return (
    <>
      <PageTitle title="利用者別 月間集計" sub={month ? jpMonth(month) : "記録なし"}>
        <MonthSelect months={months} value={month} base="/summary" />
        <PrintButton />
      </PageTitle>
      <h1 className="mb-2 hidden font-bold print:block">利用者別 月間集計（{month && jpMonth(month)}）</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr>{["ID", "氏名", "要介護度", "負担割合", "回数", "区分内訳", "提供時間", "単位数", "金額（円）"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u.id}>
                <td className={td}>{r.u.id}</td>
                <td className={td}><Link href={`/users/${r.u.id}?month=${month}`} className="text-teal-700 underline">{r.u.name}</Link></td>
                <td className={td}>{r.u.careLevel}</td>
                <td className={td}>{r.u.burden}</td>
                <td className={`${td} tabular-nums`}>{r.count}</td>
                <td className={`${td} text-xs`}>{r.byCode}</td>
                <td className={`${td} tabular-nums`}>{hm(r.minutes)}</td>
                <td className={`${td} text-right tabular-nums`}>{yen(r.units)}</td>
                <td className={`${td} text-right tabular-nums`}>{yen(r.amount)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className={td} colSpan={4}>合計</td>
              <td className={`${td} tabular-nums`}>{total("count")}</td>
              <td className={td} />
              <td className={`${td} tabular-nums`}>{hm(total("minutes"))}</td>
              <td className={`${td} text-right tabular-nums`}>{yen(total("units"))}</td>
              <td className={`${td} text-right tabular-nums`}>{yen(total("amount"))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">金額＝基本単位×{UNIT_PRICE.toFixed(2)}円（大阪市2級地、1回ごと端数切捨て）。加算・利用者負担は未計上。単価は2027年4月改定で見直し。</p>
    </>
  );
}
