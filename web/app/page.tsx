import Link from "next/link";
import { Badge, ButtonLink, Card, PageTitle, Stat } from "@/components/ui";
import { yenOf } from "@/lib/billing";
import { CHECKS } from "@/lib/checks";
import { getPeriod, getRecords, getStaff, getUsers } from "@/lib/data";
import { jpDate, yen } from "@/lib/format";
import { UNIT_PRICE } from "@/lib/master";
import { allFindings } from "@/lib/view";

export default function Dashboard() {
  const records = getRecords();
  const period = getPeriod();
  const findings = allFindings();
  const units = records.reduce((s, r) => s + r.units, 0);
  const amount = records.reduce((s, r) => s + yenOf(r.units, UNIT_PRICE), 0);
  const corrected = records.filter((r) => r.history.length > 0).length;
  const reported = records.filter((r) => r.reported).length;

  return (
    <>
      <PageTitle title="ダッシュボード" sub={`対象期間 ${jpDate(period.from)} 〜 ${jpDate(period.to)}`}>
        <ButtonLink href="/audit" primary>実地調査チェックを見る</ButtonLink>
        <ButtonLink href="/print">全記録を印刷</ButtonLink>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="サービス提供記録" value={`${records.length}件`} note={`利用者 ${getUsers().length}名 / 職員 ${getStaff().length}名`} />
        <Stat label="合計単位数" value={`${yen(units)}単位`} note="基本単位のみ（加算は未計上）" />
        <Stat label="介護報酬（概算）" value={`${yen(amount)}円`} note={`大阪市2級地 ${UNIT_PRICE.toFixed(2)}円/単位`} />
        <Stat label="自動チェックの指摘" value={`${findings.length}件`} note={`${CHECKS.length}項目をチェック`} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">実地調査チェック</h2>
          <ul className="space-y-1.5 text-sm">
            {CHECKS.map((c) => {
              const n = findings.filter((f) => f.checkId === c.id).length;
              return (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <Link href={`/audit#${c.id}`} className="hover:underline">
                    <span className="mr-2 text-slate-400">{c.id}</span>
                    {c.title}
                  </Link>
                  <Badge ok={n === 0}>{n === 0 ? "適合" : `指摘 ${n}件`}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">調査当日の流れ（この画面で出せるもの）</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>利用者を指定 → <Link className="text-teal-700 underline" href="/users">利用者別</Link>に計画と実績の突き合わせ表を表示</li>
            <li>日付・職員で <Link className="text-teal-700 underline" href="/records">記録一覧</Link> を絞り込み、該当するテレッサを1枚ずつ提示</li>
            <li>記録詳細で訂正履歴（誰が・いつ・何を・なぜ）を提示（訂正のある記録 {corrected}件）</li>
            <li><Link className="text-teal-700 underline" href="/staff">職員</Link>の資格と担当件数を提示</li>
            <li>状態変化時の報告記録（{reported}件）を記録一覧の「報告あり」で抽出</li>
            <li>求められた範囲をA4で一括印刷、またはCSVで提出</li>
          </ol>
        </Card>
      </div>
    </>
  );
}
