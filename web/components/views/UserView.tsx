"use client";

import Link from "next/link";
import { MonthSelect } from "@/components/MonthSelect";
import { PrintButton } from "@/components/PrintButton";
import { ButtonLink, Card, NotFound, Stat } from "@/components/ui";
import { yenOf } from "@/lib/billing";
import { toMin, weekdayOf, yen } from "@/lib/format";
import { UNIT_PRICE } from "@/lib/master";
import { jpMonth, monthsOf } from "@/lib/months";
import { daysOf, monthRange, plannedSlots } from "@/lib/plan";
import { useData } from "@/lib/store";

/** 利用者別 計画と実績の突き合わせ（サービス提供票の実績欄に相当） */
export function UserView({ id, month: m }: { id: string; month?: string }) {
  const { ds } = useData();
  const u = ds.users.find((x) => x.id === id);
  if (!u) return <NotFound what="利用者" />;
  const months = monthsOf(ds);
  const month = m ?? months[0] ?? ds.period.from.slice(0, 7);
  const { from, to } = monthRange(month);
  const days = daysOf(from, to);
  const rs = ds.records.filter((r) => r.userId === u.id && r.date >= from && r.date <= to);
  const slots = plannedSlots(ds.plans, u.id, from, to);
  const rows = [...new Map(slots.map((s) => [`${s.plan.id}|${s.service.weekday}|${s.service.start}|${s.service.code}`, s])).values()];
  const matched = (date: string, start: string) => rs.find((r) => r.date === date && Math.abs(toMin(r.start) - toMin(start)) <= 30);
  const extra = rs.filter((r) => !slots.some((s) => s.date === r.date && Math.abs(toMin(s.service.start) - toMin(r.start)) <= 30));
  const units = rs.reduce((s, r) => s + r.units, 0);
  const plans = ds.plans.filter((p) => p.userId === u.id).sort((a, b) => b.periodFrom.localeCompare(a.periodFrom));
  const report = ds.reports.find((r) => r.userId === u.id && r.month === month);

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{u.name} 様　<span className="text-base font-normal text-slate-500">{u.careLevel}・{u.id}</span></h1>
          <p className="mt-1 text-sm text-slate-500">認定有効期間 {u.certFrom}〜{u.certTo}　契約日 {u.contractDate || "未登録"}　{u.cmOffice} {u.careManager}</p>
          {u.note && <p className="text-sm text-slate-500">{u.note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <MonthSelect months={months} value={month} base={`/users/${u.id}`} />
          <ButtonLink href={`/print?user=${u.id}&from=${from}&to=${to}`} primary>この月の記録を印刷</ButtonLink>
          <ButtonLink href={`/reports/${u.id}-${month}`}>{jpMonth(month)}の介護報告書</ButtonLink>
          <PrintButton label="突き合わせ表を印刷" />
        </div>
      </div>
      <h1 className="mb-2 hidden font-bold print:block">計画・実績突き合わせ表　{u.name} 様（{u.careLevel}）{jpMonth(month)}</h1>

      <div className="no-print mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="計画上の予定" value={`${slots.length}回`} />
        <Stat label="実績" value={`${rs.length}回`} note={slots.length === rs.length && extra.length === 0 ? "計画どおり" : "計画との差あり"} />
        <Stat label="合計単位数" value={`${yen(units)}単位`} />
        <Stat label="介護報告書" value={report?.status ?? "未作成"} note={report?.sentAt ? `送付 ${report.sentAt.slice(0, 10)}` : undefined} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 border border-slate-200 bg-slate-50 px-2 py-1 text-left">計画のサービス</th>
              <th className="border border-slate-200 bg-slate-50 px-1">区分</th>
              {days.map((d) => (
                <th key={d} className={`border border-slate-200 px-1 py-1 font-normal ${["土", "日"].includes(weekdayOf(d)) ? "bg-rose-50" : "bg-slate-50"}`}>
                  {Number(d.slice(8))}<br />{weekdayOf(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              ["予定", "実績"].map((kind) => (
                <tr key={`${row.plan.id}-${row.service.weekday}-${row.service.start}-${kind}`}>
                  {kind === "予定" && (
                    <td rowSpan={2} className="sticky left-0 whitespace-nowrap border border-slate-200 bg-white px-2">
                      {row.service.weekday} {row.service.start}〜 {row.service.code}（{row.service.minutes}分）
                      <div className="text-[10px] text-slate-400">{row.plan.id}</div>
                    </td>
                  )}
                  <td className="border border-slate-200 px-1 text-center">{kind}</td>
                  {days.map((d) => {
                    const planned = slots.some((s) => s.date === d && s.plan.id === row.plan.id && s.service === row.service);
                    if (!planned) return <td key={d} className="border border-slate-200" />;
                    if (kind === "予定") return <td key={d} className="border border-slate-200 text-center">1</td>;
                    const r = matched(d, row.service.start);
                    return (
                      <td key={d} className="border border-slate-200 text-center">
                        {r ? <Link href={`/records/${r.no}`} className="font-bold text-teal-700 underline" title={`${r.no} ${r.start}〜${r.end} ${r.billingCode}`}>1</Link> : <span className="text-red-600">×</span>}
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </Card>
      {extra.length > 0 && (
        <Card className="mt-3 border-red-200 text-sm">
          <h2 className="mb-1 font-bold text-red-700">計画にない訪問（{extra.length}件）</h2>
          {extra.map((r) => <div key={r.no}><Link href={`/records/${r.no}`} className="underline">{r.no}</Link> {r.date} {r.start}〜{r.end} {r.billingCode}</div>)}
        </Card>
      )}
      <p className="no-print mt-2 text-xs text-slate-500">実績の「1」を押すと該当するテレッサを表示します。×は予定ありで実績なし（理由を介護報告書に記載）。</p>

      <Card className="no-print mt-4">
        <h2 className="mb-2 font-bold">訪問介護計画の履歴</h2>
        <ul className="space-y-1 text-sm">
          {plans.map((p) => (
            <li key={p.id}><Link href={`/plans/${p.id}`} className="text-teal-700 underline">{p.id}</Link>　期間 {p.periodFrom}〜{p.periodTo}　作成 {p.createdAt}　同意 {p.agreedAt || "未"}　交付 {p.deliveredAt || "未"}</li>
          ))}
          {plans.length === 0 && <li className="text-red-700">計画が登録されていません</li>}
        </ul>
        <p className="mt-2 text-xs text-slate-500">概算金額 {yen(yenOf(rs.reduce((s, r) => s + r.units, 0), UNIT_PRICE))}円（{jpMonth(month)}）</p>
      </Card>
    </>
  );
}
