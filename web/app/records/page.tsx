import Link from "next/link";
import { FilterForm } from "@/components/FilterForm";
import { ButtonLink, PageTitle, td, th } from "@/components/ui";
import { yenOf } from "@/lib/billing";
import { getStaffById, getUser } from "@/lib/data";
import { slashDate, weekdayOf, yen } from "@/lib/format";
import { UNIT_PRICE } from "@/lib/master";
import { queryString, readFilters, selectRecords } from "@/lib/query";
import { allFindings, type SearchParams } from "@/lib/view";

export default async function RecordsPage({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(await searchParams);
  const rs = selectRecords(f);
  const qs = queryString(f);
  const flagged = new Set(allFindings().map((x) => x.recordNo));
  const units = rs.reduce((s, r) => s + r.units, 0);
  return (
    <>
      <PageTitle title="記録一覧" sub={`${rs.length}件 / ${yen(units)}単位 / ${yen(rs.reduce((s, r) => s + yenOf(r.units, UNIT_PRICE), 0))}円`}>
        <ButtonLink href={`/print${qs}`} primary>この条件で印刷（A4・1件1枚）</ButtonLink>
        <ButtonLink href={`/api/records.csv${qs}`}>CSV出力</ButtonLink>
      </PageTitle>
      <FilterForm f={f} action="/records" />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["記録No", "提供日", "利用者", "時間", "分", "計画", "算定", "単位", "身体介護", "生活援助", "担当", "確認", ""].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rs.map((r) => (
              <tr key={r.no} className="hover:bg-teal-50/40">
                <td className={td}>
                  <Link href={`/records/${r.no}`} className="font-medium text-teal-700 underline">{r.no}</Link>
                </td>
                <td className={`${td} whitespace-nowrap`}>{slashDate(r.date)}（{weekdayOf(r.date)}）</td>
                <td className={`${td} whitespace-nowrap`}>{getUser(r.userId)?.name}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{r.start}〜{r.end}</td>
                <td className={`${td} tabular-nums`}>{r.minutes}</td>
                <td className={`${td} whitespace-nowrap`}>{r.planCode}</td>
                <td className={`${td} whitespace-nowrap`}>{r.billingCode}</td>
                <td className={`${td} tabular-nums`}>{r.units}</td>
                <td className={`${td} text-xs`}>{r.body.join("、") || "―"}</td>
                <td className={`${td} text-xs`}>{r.life.join("、") || "―"}</td>
                <td className={`${td} whitespace-nowrap text-xs`}>{getStaffById(r.staffId)?.name}</td>
                <td className={`${td} whitespace-nowrap text-xs`}>
                  {r.userConfirmed ? "利" : "－"}/{r.supervisorCheckedBy ? "サ" : "－"}
                </td>
                <td className={`${td} whitespace-nowrap text-xs`}>
                  {flagged.has(r.no) && <span className="mr-1 text-red-700">指摘</span>}
                  {r.reported && <span className="mr-1 text-amber-700">報告</span>}
                  {r.history.length > 0 && <span className="text-sky-700">訂正</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">確認欄：利＝利用者確認、サ＝サービス提供責任者確認</p>
    </>
  );
}
