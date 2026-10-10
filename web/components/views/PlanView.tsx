"use client";

import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { Badge, Card, NotFound } from "@/components/ui";
import { CHECKS } from "@/lib/checks";
import { jpDate } from "@/lib/format";
import { WEEKDAYS } from "@/lib/master";
import { lookup, useData } from "@/lib/store";

const L = "border border-slate-800 bg-slate-100 px-2 py-1.5 text-center font-semibold whitespace-nowrap align-middle";
const V = "border border-slate-800 px-2 py-1.5 align-top";
const d = (s: string) => (s ? jpDate(s) : "　　年　　月　　日");

/** 訪問介護計画書（A4縦） */
export function PlanView({ id }: { id: string }) {
  const { ds, findings } = useData();
  const p = ds.plans.find((x) => x.id === id);
  if (!p) return <NotFound what="訪問介護計画" />;
  const u = lookup(ds).user(p.userId);
  const fs = findings.filter((f) => f.kind === "plan" && f.target === p.id);
  const services = [...p.services].sort((a, b) => ((WEEKDAYS.indexOf(a.weekday) + 6) % 7) - ((WEEKDAYS.indexOf(b.weekday) + 6) % 7) || a.start.localeCompare(b.start));
  const used = ds.records.filter((r) => r.userId === p.userId && r.date >= p.periodFrom && r.date <= p.periodTo).length;

  return (
    <div className="print-block grid gap-4 lg:grid-cols-[1fr_300px]">
      <article className="sheet mx-auto w-full max-w-[190mm] bg-white p-6 text-[12px] leading-relaxed shadow print:p-0">
        <h1 className="text-center text-lg font-bold tracking-widest">訪問介護計画書</h1>
        <div className="mt-1 flex justify-between text-[11px]">
          <span>{ds.office.corp}　{ds.office.name}</span>
          <span>計画ID {p.id}</span>
        </div>
        {ds.source === "mock" && <div className="text-[10px] text-red-700">※架空のモックデータ</div>}
        <table className="mt-2 w-full border-collapse">
          <tbody>
            <tr>
              <td className={L}>利用者名</td><td className={V}>{u?.name ?? p.userId} 様</td>
              <td className={L}>要介護度</td><td className={V}>{u?.careLevel}</td>
            </tr>
            <tr>
              <td className={L}>認定有効期間</td><td className={V}>{u?.certFrom}〜{u?.certTo}</td>
              <td className={L}>居宅介護支援</td><td className={V}>{u?.cmOffice} {u?.careManager}</td>
            </tr>
            <tr>
              <td className={L}>作成日</td><td className={V}>{d(p.createdAt)}</td>
              <td className={L}>作成者（サ責）</td><td className={V}>{p.createdBy}</td>
            </tr>
            <tr>
              <td className={L}>計画期間</td><td className={V}>{d(p.periodFrom)} 〜 {d(p.periodTo)}</td>
              <td className={L}>ケアプラン作成日</td><td className={V}>{d(p.carePlanDate)}</td>
            </tr>
            <tr><td className={L}>本人・家族の意向</td><td className={V} colSpan={3}>{p.wish}</td></tr>
            <tr><td className={L}>長期目標</td><td className={V} colSpan={3}>{p.longGoal}</td></tr>
            <tr>
              <td className={L}>短期目標</td>
              <td className={V} colSpan={3}>{p.shortGoals.map((g, i) => <div key={i}>{i + 1}. {g}</div>)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 border border-b-0 border-slate-800 bg-sky-100 px-2 py-1 font-semibold">■ サービス内容</div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={L}>曜日</th><th className={L}>時間</th><th className={L}>区分</th><th className={L}>具体的なサービス内容</th><th className={L}>留意事項・手順</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i}>
                <td className={`${V} text-center`}>{s.weekday}</td>
                <td className={`${V} whitespace-nowrap`}>{s.start}〜<br />（{s.minutes}分）</td>
                <td className={`${V} whitespace-nowrap`}>{s.code}{s.bodyMinutes !== undefined && <div className="text-[10px]">うち身体{s.bodyMinutes}分</div>}</td>
                <td className={V}>{s.content}</td>
                <td className={V}>{s.caution}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse">
          <tbody>
            <tr>
              <td className={V} colSpan={2}>上記の訪問介護計画について説明を受け、同意し、交付を受けました。</td>
            </tr>
            <tr>
              <td className={`${V} w-1/2`}>説明・同意日　{d(p.agreedAt)}</td>
              <td className={V}>交付日　{d(p.deliveredAt)}</td>
            </tr>
            <tr>
              <td className={`${V} h-[14mm]`}>利用者署名　{p.agreedAt ? `${u?.name ?? ""}${ds.source === "mock" ? "（モック）" : "（署名済）"}` : ""}</td>
              <td className={V}>説明者　{p.createdBy}</td>
            </tr>
          </tbody>
        </table>
      </article>
      <aside className="no-print space-y-4">
        <div className="flex gap-2">
          <PrintButton label="計画書を印刷" />
          <Link href="/plans" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">一覧へ</Link>
        </div>
        <Card>
          <h2 className="mb-2 font-bold">自動チェック</h2>
          {fs.length === 0 ? <Badge ok>指摘なし</Badge> : (
            <ul className="list-disc pl-4 text-sm text-red-700">{fs.map((f, k) => <li key={k}>{CHECKS.find((c) => c.id === f.checkId)?.title}：{f.message}</li>)}</ul>
          )}
        </Card>
        <Card className="text-sm">
          <h2 className="mb-2 font-bold">この計画に基づく記録</h2>
          <p>{used}件</p>
          <Link href={`/records?user=${p.userId}&from=${p.periodFrom}&to=${p.periodTo}`} className="text-teal-700 underline">記録一覧で見る</Link>
          <span className="mx-2 text-slate-300">|</span>
          <Link href={`/users/${p.userId}`} className="text-teal-700 underline">突き合わせ表</Link>
        </Card>
      </aside>
    </div>
  );
}
