"use client";

import Link from "next/link";
import { Badge, Empty, PageTitle, td, th } from "@/components/ui";
import { ymd } from "@/lib/format";
import { lookup, useData } from "@/lib/store";

export default function PlansPage() {
  const { ds, findings } = useData();
  const L = lookup(ds);
  const today = ymd(new Date());
  const plans = [...ds.plans].sort((a, b) => a.userId.localeCompare(b.userId) || b.periodFrom.localeCompare(a.periodFrom));
  return (
    <>
      <PageTitle title="訪問介護計画" sub={`${plans.length}件`} />
      {plans.length === 0 ? <Empty>訪問介護計画が未登録です。<Link href="/import" className="ml-1 underline">取り込み</Link></Empty> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr>{["計画ID", "利用者", "計画期間", "作成日／作成者", "ケアプラン作成日", "同意日", "交付日", "サービス", "状態", "チェック"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {plans.map((p) => {
                const n = findings.filter((f) => f.kind === "plan" && f.target === p.id).length;
                const state = p.periodTo < today ? "終了" : p.periodFrom > today ? "開始前" : "有効";
                return (
                  <tr key={p.id}>
                    <td className={td}><Link href={`/plans/${p.id}`} className="font-medium text-teal-700 underline">{p.id}</Link></td>
                    <td className={`${td} whitespace-nowrap`}>{L.user(p.userId)?.name ?? p.userId}</td>
                    <td className={`${td} whitespace-nowrap text-xs`}>{p.periodFrom}〜{p.periodTo}</td>
                    <td className={`${td} whitespace-nowrap text-xs`}>{p.createdAt}<br />{p.createdBy}</td>
                    <td className={`${td} text-xs`}>{p.carePlanDate}</td>
                    <td className={`${td} text-xs`}>{p.agreedAt || <span className="text-red-700">未</span>}</td>
                    <td className={`${td} text-xs`}>{p.deliveredAt || <span className="text-red-700">未</span>}</td>
                    <td className={`${td} text-xs`}>{p.services.map((s) => `${s.weekday}${s.code}`).join("、")}</td>
                    <td className={`${td} text-xs`}>{state}</td>
                    <td className={td}><Badge ok={n === 0}>{n === 0 ? "適合" : `指摘 ${n}`}</Badge></td>
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
