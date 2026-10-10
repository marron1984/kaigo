"use client";

import Link from "next/link";
import { Empty, PageTitle, td, th } from "@/components/ui";
import { ymd } from "@/lib/format";
import { activePlan } from "@/lib/plan";
import { useData } from "@/lib/store";

export default function UsersPage() {
  const { ds } = useData();
  const today = ymd(new Date());
  return (
    <>
      <PageTitle title="利用者" sub={ds.source === "mock" ? "氏名・被保険者番号はすべて架空" : `${ds.users.length}名`} />
      {ds.users.length === 0 ? <Empty>利用者リストが未登録です。<Link href="/import" className="ml-1 underline">取り込み</Link></Empty> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr>{["ID", "氏名", "要介護度", "認定有効期間", "居宅介護支援／担当", "契約日", "現在の訪問介護計画", "記録"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ds.users.map((u) => {
                const plan = activePlan(ds.plans, u.id, today) ?? ds.plans.filter((p) => p.userId === u.id).sort((a, b) => b.periodTo.localeCompare(a.periodTo))[0];
                const expired = u.certTo && u.certTo < today;
                return (
                  <tr key={u.id}>
                    <td className={td}>{u.id}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      <Link href={`/users/${u.id}`} className="font-medium text-teal-700 underline">{u.name}</Link>
                      <div className="text-xs text-slate-500">{u.kana}　{u.sex}</div>
                    </td>
                    <td className={td}>{u.careLevel}</td>
                    <td className={`${td} whitespace-nowrap text-xs ${expired ? "text-red-700" : ""}`}>{u.certFrom || "未登録"}〜{u.certTo}</td>
                    <td className={`${td} text-xs`}>{u.cmOffice}<br />{u.careManager}</td>
                    <td className={`${td} whitespace-nowrap text-xs`}>{u.contractDate || <span className="text-red-700">未登録</span>}</td>
                    <td className={`${td} text-xs`}>
                      {plan ? <Link href={`/plans/${plan.id}`} className="underline">{plan.periodFrom}〜{plan.periodTo}</Link> : <span className="text-red-700">未登録</span>}
                    </td>
                    <td className={td}>{ds.records.filter((r) => r.userId === u.id).length}件</td>
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
