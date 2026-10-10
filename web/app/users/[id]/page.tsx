import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ButtonLink, Card, Stat } from "@/components/ui";
import { yenOf } from "@/lib/billing";
import { getPeriod, getRecords, getUser } from "@/lib/data";
import { parseDate, weekdayOf, ymd, yen } from "@/lib/format";
import { UNIT_PRICE } from "@/lib/master";

/** 利用者別 計画と実績の突き合わせ（サービス提供票の実績欄に相当） */
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = getUser(id);
  if (!u) notFound();
  const period = getPeriod();
  const rs = getRecords().filter((r) => r.userId === u.id);
  const days: string[] = [];
  for (const d = parseDate(period.from); ymd(d) <= period.to; d.setDate(d.getDate() + 1)) days.push(ymd(d));
  const units = rs.reduce((s, r) => s + r.units, 0);
  const planned = u.plan.reduce((s, p) => s + days.filter((d) => weekdayOf(d) === p.weekday).length, 0);

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{u.name} 様　<span className="text-base font-normal text-slate-500">{u.careLevel}・{u.id}</span></h1>
          <p className="mt-1 text-sm text-slate-500">{u.note}　計画作成 {u.planCreated}／利用者同意 {u.planAgreed}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/print?user=${u.id}`} primary>この利用者の記録を全件印刷</ButtonLink>
          <PrintButton label="突き合わせ表を印刷" />
        </div>
      </div>
      <h1 className="mb-2 hidden font-bold print:block">計画・実績突き合わせ表　{u.name} 様（{u.careLevel}）{period.from.slice(0, 7)}</h1>

      <div className="no-print mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="計画回数" value={`${planned}回`} />
        <Stat label="実績回数" value={`${rs.length}回`} note={planned === rs.length ? "計画どおり" : "計画との差あり"} />
        <Stat label="合計単位数" value={`${yen(units)}単位`} />
        <Stat label="概算金額" value={`${yen(rs.reduce((s, r) => s + yenOf(r.units, UNIT_PRICE), 0))}円`} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 border border-slate-200 bg-slate-50 px-2 py-1 text-left">計画</th>
              <th className="border border-slate-200 bg-slate-50 px-1">区分</th>
              {days.map((d) => (
                <th key={d} className={`border border-slate-200 px-1 py-1 font-normal ${["土", "日"].includes(weekdayOf(d)) ? "bg-rose-50" : "bg-slate-50"}`}>
                  {Number(d.slice(8))}
                  <br />
                  {weekdayOf(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {u.plan.map((p, i) => (
              ["予定", "実績"].map((kind) => (
                <tr key={`${i}-${kind}`}>
                  {kind === "予定" && (
                    <td rowSpan={2} className="sticky left-0 whitespace-nowrap border border-slate-200 bg-white px-2">
                      {p.weekday} {p.start}〜<br />{p.code}（{p.minutes}分）
                    </td>
                  )}
                  <td className="border border-slate-200 px-1 text-center">{kind}</td>
                  {days.map((d) => {
                    if (weekdayOf(d) !== p.weekday) return <td key={d} className="border border-slate-200" />;
                    if (kind === "予定") return <td key={d} className="border border-slate-200 text-center">1</td>;
                    const r = rs.find((x) => x.date === d && x.planCode === p.code && Math.abs(Number(x.start.slice(0, 2)) - Number(p.start.slice(0, 2))) <= 1);
                    return (
                      <td key={d} className="border border-slate-200 text-center">
                        {r ? <Link href={`/records/${r.no}`} className="font-bold text-teal-700 underline" title={`${r.no} ${r.start}〜${r.end} ${r.billingCode}`}>1</Link> : <span className="text-red-600">×</span>}
                      </td>
                    );
                  })}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </Card>
      <p className="no-print mt-2 text-xs text-slate-500">実績の「1」をクリックすると該当するテレッサを表示します。×は予定ありで実績なし。</p>
    </>
  );
}
