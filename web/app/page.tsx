"use client";

import Link from "next/link";
import { Badge, ButtonLink, Card, PageTitle, Stat } from "@/components/ui";
import { yenOf } from "@/lib/billing";
import { CHECKS, type CheckGroup } from "@/lib/checks";
import { jpDate, parseDate, yen, ymd } from "@/lib/format";
import { UNIT_PRICE } from "@/lib/master";
import { useData } from "@/lib/store";

function addDays(date: string, n: number) {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export default function Dashboard() {
  const { ds, findings } = useData();
  const { records, period } = ds;
  const units = records.reduce((s, r) => s + r.units, 0);
  const amount = yenOf(units, UNIT_PRICE);
  const today = ymd(new Date());
  const soon = addDays(today, 45);
  const alerts = [
    ...ds.plans
      .filter((p) => p.periodTo >= today && p.periodTo <= soon && !ds.plans.some((q) => q.userId === p.userId && q.periodFrom > p.periodTo))
      .map((p) => ({ key: p.id, href: `/plans/${p.id}`, text: `${ds.users.find((u) => u.id === p.userId)?.name ?? p.userId}：訪問介護計画の期間が ${p.periodTo} に終了（次期計画が未登録）` })),
    ...ds.users
      .filter((u) => u.certTo && u.certTo >= today && u.certTo <= soon)
      .map((u) => ({ key: u.id, href: `/users/${u.id}`, text: `${u.name}：要介護認定の有効期間が ${u.certTo} に終了（更新状況を確認）` })),
  ];
  const groups: CheckGroup[] = ["記録", "計画", "利用者", "報告"];

  if (ds.users.length === 0)
    return (
      <Card className="text-center">
        <h1 className="mb-2 text-lg font-bold">データがまだありません</h1>
        <p className="mb-4 text-sm text-slate-600">利用者リスト → 職員 → 訪問介護計画 → サービス提供記録 の順に取り込んでください。</p>
        <ButtonLink href="/import" primary>取り込み画面へ</ButtonLink>
      </Card>
    );

  return (
    <>
      <PageTitle title="ダッシュボード" sub={records.length ? `記録の期間 ${jpDate(period.from)} 〜 ${jpDate(period.to)}` : "サービス提供記録は未登録"}>
        <ButtonLink href="/audit" primary>運営指導チェックを見る</ButtonLink>
        <ButtonLink href="/print">全記録を印刷</ButtonLink>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="サービス提供記録" value={`${records.length}件`} note={`利用者 ${ds.users.length}名 / 職員 ${ds.staff.length}名 / 計画 ${ds.plans.length}件`} />
        <Stat label="合計単位数" value={`${yen(units)}単位`} note="基本単位のみ（加算は未計上）" />
        <Stat label="介護報酬（概算）" value={`${yen(amount)}円`} note={`大阪市2級地 ${UNIT_PRICE.toFixed(2)}円/単位`} />
        <Stat label="自動チェックの指摘" value={`${findings.length}件`} note={`${CHECKS.length}項目をチェック`} />
      </div>

      {alerts.length > 0 && (
        <Card className="mt-4 border-amber-300 bg-amber-50">
          <h2 className="mb-2 font-bold text-amber-900">期限が近いもの（45日以内）</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {alerts.map((a) => (
              <li key={a.key}><Link href={a.href} className="underline">{a.text}</Link></li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">運営指導チェック</h2>
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <div className="mb-1 text-xs font-semibold text-slate-500">{g}</div>
              <ul className="space-y-1 text-sm">
                {CHECKS.filter((c) => c.group === g).map((c) => {
                  const n = findings.filter((f) => f.checkId === c.id).length;
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <Link href={`/audit#${c.id}`} className="hover:underline"><span className="mr-2 text-slate-400">{c.id}</span>{c.title}</Link>
                      <Badge ok={n === 0}>{n === 0 ? "適合" : `指摘 ${n}件`}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">運営指導当日に出すもの</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li><Link className="text-teal-700 underline" href="/plans">訪問介護計画</Link>：目標・サービス内容・作成者・同意日・交付日</li>
            <li><Link className="text-teal-700 underline" href="/users">利用者別</Link>の計画と実績の突き合わせ表</li>
            <li><Link className="text-teal-700 underline" href="/records">サービス提供記録</Link>（テレッサ）を日付・職員で絞り込んで提示、訂正履歴つき</li>
            <li><Link className="text-teal-700 underline" href="/reports">介護報告書</Link>：月ごとの目標評価とケアマネへの送付日</li>
            <li><Link className="text-teal-700 underline" href="/staff">職員</Link>の資格と担当件数</li>
            <li><Link className="text-teal-700 underline" href="/self-check">自己点検</Link>：重要事項説明書・研修・委員会・BCPなど書類の準備状況</li>
          </ol>
        </Card>
      </div>
    </>
  );
}
