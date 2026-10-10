"use client";

import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { Badge, Card, PageTitle, td, th } from "@/components/ui";
import { CHECKS } from "@/lib/checks";
import { targetHref } from "@/lib/links";
import { useData } from "@/lib/store";

export default function AuditPage() {
  const { ds, findings } = useData();
  return (
    <>
      <PageTitle title="運営指導チェック" sub={`記録${ds.records.length}件・計画${ds.plans.length}件・報告書${ds.reports.length}件を${CHECKS.length}項目で自動チェック`}>
        <PrintButton label="この結果を印刷" />
      </PageTitle>
      <h1 className="mb-3 hidden text-lg font-bold print:block">運営指導チェック結果</h1>
      <Card className="mb-4 text-sm">
        {findings.length === 0 ? (
          <p className="font-medium text-emerald-700">全項目で指摘はありません。</p>
        ) : (
          <p className="font-medium text-red-700">{findings.length}件の指摘があります。原本を確認し、訂正する場合は理由を残してください。</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          記録・計画・報告書の形式上の整合を確認するものです。書類が揃っているかは<Link href="/self-check" className="underline">自己点検</Link>で管理してください。
          判断に迷う場合は大阪市の最新の指導資料・Q&Aで確認してください。
        </p>
      </Card>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["No", "分類", "確認項目", "確認内容", "根拠の考え方", "結果"].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {CHECKS.map((c) => {
              const fs = findings.filter((f) => f.checkId === c.id);
              return (
                <tr key={c.id} id={c.id}>
                  <td className={`${td} text-slate-400`}>{c.id}</td>
                  <td className={`${td} whitespace-nowrap text-xs`}>{c.group}</td>
                  <td className={`${td} font-medium`}>{c.title}</td>
                  <td className={td}>
                    {c.detail}
                    {fs.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                        {fs.slice(0, 50).map((f, i) => (
                          <li key={i}><Link href={targetHref(f)} className="underline">{f.target}</Link>：{f.message}</li>
                        ))}
                        {fs.length > 50 && <li>ほか {fs.length - 50}件</li>}
                      </ul>
                    )}
                  </td>
                  <td className={`${td} text-xs text-slate-500`}>{c.basis}</td>
                  <td className={td}><Badge ok={fs.length === 0}>{fs.length === 0 ? "適合" : `指摘 ${fs.length}件`}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
