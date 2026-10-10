import Link from "next/link";
import { Badge, Card, PageTitle, td, th } from "@/components/ui";
import { CHECKS } from "@/lib/checks";
import { getRecords } from "@/lib/data";
import { allFindings } from "@/lib/view";
import { PrintButton } from "@/components/PrintButton";

export default function AuditPage() {
  const findings = allFindings();
  const total = getRecords().length;
  return (
    <>
      <PageTitle title="実地調査チェック" sub={`全${total}件の記録を${CHECKS.length}項目で自動チェックした結果`}>
        <PrintButton label="この結果を印刷" />
      </PageTitle>
      <h1 className="mb-3 hidden text-lg font-bold print:block">実地調査チェック結果（全{total}件）</h1>
      <Card className="mb-4 text-sm">
        {findings.length === 0 ? (
          <p className="font-medium text-emerald-700">全項目で指摘はありません。</p>
        ) : (
          <p className="font-medium text-red-700">{findings.length}件の指摘があります。記録を確認し、訂正する場合は理由を残してください。</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          自動チェックは記録の形式上の整合を確認するものです。計画書・アセスメント・モニタリング・重要事項説明書など記録以外の書類は対象外です。
        </p>
      </Card>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>No</th>
              <th className={th}>確認項目</th>
              <th className={th}>確認内容</th>
              <th className={th}>根拠の考え方</th>
              <th className={th}>結果</th>
            </tr>
          </thead>
          <tbody>
            {CHECKS.map((c) => {
              const fs = findings.filter((f) => f.checkId === c.id);
              return (
                <tr key={c.id} id={c.id}>
                  <td className={`${td} text-slate-400`}>{c.id}</td>
                  <td className={`${td} font-medium`}>{c.title}</td>
                  <td className={td}>
                    {c.detail}
                    {fs.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                        {fs.map((f, i) => (
                          <li key={i}>
                            <Link href={`/records/${f.recordNo}`} className="underline">{f.recordNo}</Link>：{f.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={`${td} text-xs text-slate-500`}>{c.basis}</td>
                  <td className={td}>
                    <Badge ok={fs.length === 0}>{fs.length === 0 ? "適合" : `指摘 ${fs.length}件`}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
