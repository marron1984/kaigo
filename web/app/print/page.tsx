import { PrintButton } from "@/components/PrintButton";
import { TeressaSheet } from "@/components/TeressaSheet";
import { ButtonLink } from "@/components/ui";
import { queryString, readFilters, selectRecords } from "@/lib/query";
import type { SearchParams } from "@/lib/view";

export default async function PrintPage({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(await searchParams);
  const rs = selectRecords(f);
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <span>印刷対象 {rs.length}件（A4縦・1件1ページ）</span>
        <PrintButton label={`${rs.length}件を印刷`} />
        <ButtonLink href={`/records${queryString(f)}`}>条件を変える</ButtonLink>
      </div>
      {rs.map((r) => (
        <TeressaSheet key={r.no} r={r} />
      ))}
    </>
  );
}
