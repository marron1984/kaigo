"use client";

import { PrintButton } from "@/components/PrintButton";
import { TeressaSheet } from "@/components/TeressaSheet";
import { ButtonLink } from "@/components/ui";
import { applyFilters, queryString, type Filters } from "@/lib/filters";
import { useData } from "@/lib/store";

export function PrintView({ f }: { f: Filters }) {
  const { ds, findings } = useData();
  const rs = applyFilters(ds.records, f, new Set(findings.map((x) => x.target)));
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <span>印刷対象 {rs.length}件（A4縦・1件1ページ）</span>
        <PrintButton label={`${rs.length}件を印刷`} />
        <ButtonLink href={`/records${queryString(f)}`}>条件を変える</ButtonLink>
      </div>
      {rs.map((r) => <TeressaSheet key={r.no} r={r} />)}
    </>
  );
}
