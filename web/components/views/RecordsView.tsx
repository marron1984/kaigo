"use client";

import Link from "next/link";
import { useState } from "react";
import { ImportCard, STEPS } from "@/components/ImportCard";
import { FilterForm } from "@/components/FilterForm";
import { ButtonLink, Empty, PageTitle, td, th } from "@/components/ui";
import { yenOf } from "@/lib/billing";
import { downloadCSV } from "@/lib/csv";
import { applyFilters, queryString, type Filters } from "@/lib/filters";
import { slashDate, weekdayOf, yen } from "@/lib/format";
import { UNIT_PRICE } from "@/lib/master";
import { lookup, useData } from "@/lib/store";

export function RecordsView({ f }: { f: Filters }) {
  const { ds, findings } = useData();
  const [openImport, setOpenImport] = useState(() => ds.records.length === 0);
  const L = lookup(ds);
  const flagged = new Set(findings.filter((x) => x.kind === "record").map((x) => x.target));
  const rs = applyFilters(ds.records, f, flagged);
  const qs = queryString(f);
  const units = rs.reduce((s, r) => s + r.units, 0);

  const exportCSV = () =>
    downloadCSV("サービス提供記録.csv", [
      ["記録No", "提供日", "利用者ID", "利用者名", "開始", "終了", "提供分", "計画区分", "算定区分", "身体介護時間", "単位数", "金額", "身体介護", "生活援助", "担当職員", "体温", "血圧", "脈拍", "顔色・様子", "食事摂取", "排泄", "特記事項", "報告先", "利用者確認", "サ責確認日時", "サ責確認者", "訂正件数"],
      ...rs.map((r) => [
        r.no, r.date, r.userId, L.user(r.userId)?.name, r.start, r.end, r.minutes, r.planCode, r.billingCode, r.bodyMinutes, r.units,
        yenOf(r.units, UNIT_PRICE), r.body.join("・"), r.life.join("・"), L.staffName(r.staffId), r.vitals.temp, r.vitals.bp, r.vitals.pulse,
        r.condition, r.meal, r.excretion, r.note, r.reportTo, r.userConfirmed ? "済" : "未", r.supervisorCheckedAt?.replace("T", " "),
        L.staffName(r.supervisorCheckedBy), r.history.length,
      ]),
    ]);

  return (
    <>
      <PageTitle title="サービス提供記録（テレッサ）" sub={`${rs.length}件 / ${yen(units)}単位 / ${yen(yenOf(rs.reduce((s, r) => s + r.units, 0), UNIT_PRICE))}円`}>
        <ButtonLink href={`/print${qs}`} primary>この条件で印刷（A4・1件1枚）</ButtonLink>
        <button onClick={exportCSV} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">CSV出力</button>
        <button onClick={() => setOpenImport((v) => !v)} className="rounded border border-teal-700 bg-white px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">
          {openImport ? "読み込みを閉じる" : "提供記録を読み込む"}
        </button>
      </PageTitle>
      {openImport && (
        <div className="no-print mb-4">
          <ImportCard step={STEPS.find((s) => s.kind === "records")!} title="提供記録を読み込む" />
        </div>
      )}
      <FilterForm f={f} action="/records" />
      {rs.length === 0 ? (
        <Empty>該当する記録がありません。</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["記録No", "提供日", "利用者", "時間", "分", "計画", "算定", "単位", "身体介護", "生活援助", "担当", "確認", ""].map((h) => <th key={h} className={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rs.map((r) => (
                <tr key={r.no} className="hover:bg-teal-50/40">
                  <td className={td}><Link href={`/records/${r.no}`} className="font-medium text-teal-700 underline">{r.no}</Link></td>
                  <td className={`${td} whitespace-nowrap`}>{slashDate(r.date)}（{weekdayOf(r.date)}）</td>
                  <td className={`${td} whitespace-nowrap`}>{L.user(r.userId)?.name ?? r.userId}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{r.start}〜{r.end}</td>
                  <td className={`${td} tabular-nums`}>{r.minutes}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.planCode}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.billingCode}</td>
                  <td className={`${td} tabular-nums`}>{r.units}</td>
                  <td className={`${td} text-xs`}>{r.body.join("、") || "―"}</td>
                  <td className={`${td} text-xs`}>{r.life.join("、") || "―"}</td>
                  <td className={`${td} whitespace-nowrap text-xs`}>{L.staffName(r.staffId)}</td>
                  <td className={`${td} whitespace-nowrap text-xs`}>{r.userConfirmed ? "利" : "－"}/{r.supervisorCheckedBy ? "サ" : "－"}</td>
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
      )}
      <p className="mt-2 text-xs text-slate-500">確認欄：利＝利用者確認、サ＝サービス提供責任者確認</p>
    </>
  );
}
