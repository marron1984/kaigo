"use client";

import { PrintButton } from "@/components/PrintButton";
import { Card, PageTitle, input, td, th } from "@/components/ui";
import { localIso } from "@/lib/format";
import { SELF_CHECK } from "@/lib/selfcheck";
import { useData } from "@/lib/store";
import type { SelfCheckEntry } from "@/lib/types";

const STATUS: SelfCheckEntry["status"][] = ["済", "一部", "未"];
const color = (s: string) => (s === "済" ? "bg-emerald-100 text-emerald-800" : s === "一部" ? "bg-amber-100 text-amber-800" : s === "未" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-500");

export default function SelfCheckPage() {
  const { ds, setSelfCheck } = useData();
  const groups = [...new Set(SELF_CHECK.map((i) => i.group))];
  const done = SELF_CHECK.filter((i) => ds.selfCheck[i.id]?.status === "済").length;
  const update = (id: string, patch: Partial<SelfCheckEntry>) => {
    const cur = ds.selfCheck[id] ?? { status: "", note: "", updatedAt: "" };
    setSelfCheck(id, { ...cur, ...patch, updatedAt: localIso().slice(0, 10) });
  };
  return (
    <>
      <PageTitle title="運営指導 自己点検" sub={`書類・体制の準備状況　済 ${done} / ${SELF_CHECK.length}項目`}>
        <PrintButton />
      </PageTitle>
      <h1 className="mb-2 hidden text-lg font-bold print:block">運営指導 自己点検（済 {done} / {SELF_CHECK.length}）</h1>
      <Card className="mb-4 text-xs text-slate-600">
        一般的な確認事項をまとめたものです。最終確認は、大阪市が公表している訪問介護の自己点検シート・運営指導の資料（最新年度）で行ってください。
        記録・計画・報告書の内容は「運営指導チェック」で自動確認できます。
      </Card>
      <div className="mb-4 h-2 overflow-hidden rounded bg-slate-200">
        <div className="h-full bg-teal-600" style={{ width: `${(done / SELF_CHECK.length) * 100}%` }} />
      </div>
      {groups.map((g) => (
        <section key={g} className="mb-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">{g}</h2>
          <table className="w-full text-sm">
            <thead><tr>{["項目", "確認の観点", "状況", "メモ（保管場所・次回対応など）", "更新日"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {SELF_CHECK.filter((i) => i.group === g).map((i) => {
                const e = ds.selfCheck[i.id];
                return (
                  <tr key={i.id}>
                    <td className={`${td} w-48 font-medium`}>{i.title}</td>
                    <td className={`${td} text-xs text-slate-600`}>{i.hint}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="no-print flex gap-1">
                        {STATUS.map((s) => (
                          <button key={s} onClick={() => update(i.id, { status: e?.status === s ? "" : s })} className={`rounded px-2 py-1 text-xs ${e?.status === s ? color(s) + " font-bold ring-1 ring-current" : "bg-slate-50 text-slate-500"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <span className={`hidden rounded px-2 py-0.5 text-xs print:inline ${color(e?.status ?? "")}`}>{e?.status || "未確認"}</span>
                    </td>
                    <td className={`${td} w-72`}>
                      <input className={`${input} no-print`} defaultValue={e?.note ?? ""} onBlur={(ev) => ev.target.value !== (e?.note ?? "") && update(i.id, { note: ev.target.value })} />
                      <span className="hidden text-xs print:inline">{e?.note}</span>
                    </td>
                    <td className={`${td} whitespace-nowrap text-xs`}>{e?.updatedAt ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
