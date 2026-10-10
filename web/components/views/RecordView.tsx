"use client";

import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { TeressaSheet } from "@/components/TeressaSheet";
import { Badge, Card, NotFound, td, th } from "@/components/ui";
import { CHECKS } from "@/lib/checks";
import { dateTime } from "@/lib/format";
import { activePlan, matchService } from "@/lib/plan";
import { lookup, useData } from "@/lib/store";

export function RecordView({ no }: { no: string }) {
  const { ds, findings } = useData();
  const L = lookup(ds);
  const r = ds.records.find((x) => x.no === no);
  if (!r) return <NotFound what={`記録 ${no} `} />;
  const all = ds.records;
  const i = all.indexOf(r);
  const fs = findings.filter((f) => f.kind === "record" && f.target === r.no);
  const plan = activePlan(ds.plans, r.userId, r.date);
  const service = matchService(plan, r);
  return (
    <div className="print-block grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="no-print mb-3 flex items-center gap-2 text-sm">
          {i > 0 && <Link href={`/records/${all[i - 1].no}`} className="rounded border border-slate-300 bg-white px-3 py-1.5">← {all[i - 1].no}</Link>}
          {i < all.length - 1 && <Link href={`/records/${all[i + 1].no}`} className="rounded border border-slate-300 bg-white px-3 py-1.5">{all[i + 1].no} →</Link>}
          <Link href="/records" className="ml-2 text-slate-500 underline">一覧へ</Link>
          <span className="ml-auto"><PrintButton label="この記録を印刷" /></span>
        </div>
        <TeressaSheet r={r} />
      </div>
      <aside className="no-print space-y-4">
        <Card>
          <h2 className="mb-2 font-bold">自動チェック</h2>
          {fs.length === 0 ? <Badge ok>指摘なし</Badge> : (
            <ul className="list-disc pl-4 text-sm text-red-700">
              {fs.map((f, k) => <li key={k}>{CHECKS.find((c) => c.id === f.checkId)?.title}：{f.message}</li>)}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">根拠となる訪問介護計画</h2>
          {plan ? (
            <div className="text-sm">
              <Link href={`/plans/${plan.id}`} className="text-teal-700 underline">{plan.id}</Link>（{plan.periodFrom}〜{plan.periodTo}）
              {service ? (
                <div className="mt-2 rounded bg-slate-50 p-2 text-xs">
                  <div>{service.weekday} {service.start}〜 {service.code}（{service.minutes}分）</div>
                  <div className="mt-1">{service.content}</div>
                  {service.caution && <div className="mt-1 text-slate-500">留意事項：{service.caution}</div>}
                </div>
              ) : <p className="mt-1 text-xs text-red-700">この曜日・時間帯のサービスは計画にありません</p>}
            </div>
          ) : <p className="text-sm text-red-700">この日に有効な計画がありません</p>}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">記録の作成・確認</h2>
          <dl className="grid grid-cols-[6em_1fr] gap-y-1 text-sm">
            <dt className="text-slate-500">作成</dt><dd>{r.createdAt ? dateTime(r.createdAt) : "―"}　{L.staffName(r.staffId)}</dd>
            <dt className="text-slate-500">利用者確認</dt><dd>{r.userConfirmed ? dateTime(r.confirmedAt) : "未確認"}</dd>
            <dt className="text-slate-500">サ責確認</dt><dd>{r.supervisorCheckedAt ? `${dateTime(r.supervisorCheckedAt)}　${L.staffName(r.supervisorCheckedBy)}` : "未確認"}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">訂正履歴</h2>
          {r.history.length === 0 ? <p className="text-sm text-slate-500">訂正はありません。</p> : (
            <table className="w-full text-xs">
              <thead><tr><th className={th}>日時・訂正者</th><th className={th}>内容</th></tr></thead>
              <tbody>
                {r.history.map((h, k) => (
                  <tr key={k}>
                    <td className={`${td} whitespace-nowrap`}>{dateTime(h.at)}<br />{L.staffName(h.by)}</td>
                    <td className={td}>
                      <div className="font-medium">{h.field}</div>
                      <div><span className="text-slate-500">訂正前：</span><span className="line-through">{h.before}</span></div>
                      <div><span className="text-slate-500">訂正後：</span>{h.after}</div>
                      <div className="mt-1 text-slate-600">理由：{h.reason}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </aside>
    </div>
  );
}
