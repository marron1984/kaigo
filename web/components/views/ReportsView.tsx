"use client";

import Link from "next/link";
import { MonthSelect } from "@/components/MonthSelect";
import { Badge, Empty, PageTitle, td, th } from "@/components/ui";
import { jpMonth, monthsOf } from "@/lib/months";
import { monthRange, plannedSlots } from "@/lib/plan";
import { useData } from "@/lib/store";

export function ReportsView({ month: m }: { month?: string }) {
  const { ds } = useData();
  const months = monthsOf(ds);
  const month = m ?? months[0] ?? "";
  const { from, to } = month ? monthRange(month) : { from: "", to: "" };
  const users = ds.users.filter(
    (u) => ds.records.some((r) => r.userId === u.id && r.date.startsWith(month)) || ds.reports.some((r) => r.userId === u.id && r.month === month),
  );
  return (
    <>
      <PageTitle title="介護報告書（月次サービス実施状況報告）" sub={month ? `${jpMonth(month)}：サービスを提供した利用者 ${users.length}名` : ""}>
        <MonthSelect months={months} value={month} base="/reports" />
      </PageTitle>
      <p className="mb-4 text-sm text-slate-600">
        訪問介護計画の目標とサービス内容、当月のサービス提供記録から下書きを自動で作成します。サ責が評価・所見を記入して確定し、ケアマネへの送付日を記録してください。
      </p>
      {users.length === 0 ? <Empty>この月にサービス提供記録のある利用者がいません。</Empty> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr>{["利用者", "担当ケアマネ", "予定／実績", "状態", "確定日", "送付日", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map((u) => {
                const rep = ds.reports.find((r) => r.userId === u.id && r.month === month);
                const planned = plannedSlots(ds.plans, u.id, from, to).length;
                const actual = ds.records.filter((r) => r.userId === u.id && r.date.startsWith(month)).length;
                return (
                  <tr key={u.id}>
                    <td className={`${td} whitespace-nowrap font-medium`}>{u.name}</td>
                    <td className={`${td} text-xs`}>{u.cmOffice} {u.careManager}</td>
                    <td className={`${td} tabular-nums`}>{planned}回／{actual}回</td>
                    <td className={td}>{rep ? <Badge ok={rep.status === "確定" && !!rep.sentAt}>{rep.status}{rep.status === "確定" && !rep.sentAt ? "・未送付" : ""}</Badge> : <Badge ok={false}>未作成</Badge>}</td>
                    <td className={`${td} text-xs`}>{rep?.finalizedAt?.slice(0, 10) ?? "―"}</td>
                    <td className={`${td} text-xs`}>{rep?.sentAt?.slice(0, 10) ?? "―"}</td>
                    <td className={td}><Link href={`/reports/${u.id}-${month}`} className="text-teal-700 underline">{rep ? "開く" : "作成する"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
