"use client";

import { useState } from "react";
import { Card, input } from "@/components/ui";
import { downloadCSV } from "@/lib/csv";
import { ENTRY_GUIDE, ENTRY_HEADER, entryRows, sheetName } from "@/lib/entryTemplate";
import { jpMonth, shiftMonths } from "@/lib/months";
import { buildSample } from "@/lib/sample";
import { useData } from "@/lib/store";

/** 記入用ひな形（予定入りCSV・利用者ごとにシートを分けたExcel）を作る */
export function EntryTemplateCard() {
  const { ds } = useData();
  const months = shiftMonths(ds.records.map((r) => r.date.slice(0, 7)));
  const [month, setMonth] = useState(months.find((m) => m === new Date().toISOString().slice(0, 7)) ?? months[0]);
  const [userId, setUserId] = useState("");
  const [msg, setMsg] = useState("");
  const targets = userId ? ds.users.filter((u) => u.id === userId) : ds.users;

  const csv = () => {
    const rows = targets.flatMap((u) => entryRows(u, ds.plans, month));
    if (rows.length === 0) return setMsg("この月に有効な訪問介護計画がありません。先に計画を取り込んでください。");
    const name = userId ? `${targets[0].name}_` : "全員_";
    downloadCSV(`提供記録_記入用_${name}${month}.csv`, [ENTRY_HEADER, ...rows]);
    setMsg(`${rows.length}行のCSVを作りました`);
  };

  const excel = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const guide = wb.addWorksheet("記入方法");
    guide.addRow(["項目", "書き方"]);
    ENTRY_GUIDE.forEach((g) => guide.addRow(g));
    guide.getColumn(1).width = 26;
    guide.getColumn(2).width = 90;
    guide.getRow(1).font = { bold: true };
    let total = 0;
    const used = new Set<string>();
    for (const u of targets) {
      const rows = entryRows(u, ds.plans, month);
      if (rows.length === 0) continue;
      let name = sheetName(u);
      while (used.has(name)) name = `${name.slice(0, 28)}_${u.id.slice(-2)}`;
      used.add(name);
      const ws = wb.addWorksheet(name, { views: [{ state: "frozen", xSplit: 6, ySplit: 1 }] });
      ws.addRow(ENTRY_HEADER);
      rows.forEach((r) => ws.addRow(r));
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
      ENTRY_HEADER.forEach((h, i) => (ws.getColumn(i + 1).width = h === "特記事項" ? 60 : h === "利用者名" ? 14 : Math.max(8, h.length * 2 + 2)));
      total += rows.length;
    }
    if (total === 0) return setMsg("この月に有効な訪問介護計画がありません。先に計画を取り込んでください。");
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `提供記録_記入用_利用者別_${month}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg(`${used.size}名分（${total}行）のExcelを作りました`);
  };

  return (
    <Card>
      <h2 className="font-bold">記入用のひな形を作る（予定入り）</h2>
      <p className="mt-1 text-xs text-slate-500">
        訪問介護計画から、利用者ごとに日付・時間・区分・単位数を入れたCSV／Excelを作ります。サービス内容・担当職員・特記事項などを書き込み、そのまま上の「提供記録を読み込む」で取り込めます（未記入の行は読み飛ばします）。
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-600">
          対象月
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={`${input} mt-1 block w-36`}>
            {months.map((m) => <option key={m} value={m}>{jpMonth(m)}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          利用者
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`${input} mt-1 block w-52`}>
            <option value="">全員</option>
            {ds.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <button onClick={csv} className="rounded border border-teal-700 px-4 py-1.5 text-sm text-teal-800">CSVを作る</button>
        <button onClick={excel} className="rounded bg-teal-700 px-4 py-1.5 text-sm font-medium text-white">Excel（利用者ごとにシート）</button>
      </div>
      {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}

      <div className="mt-4 border-t border-slate-200 pt-3">
        <h3 className="text-sm font-bold">記入例（サンプル）</h3>
        <p className="mt-1 text-xs text-slate-500">
          架空の利用者6名・2日分を中心に、全項目を埋めた提供記録の見本です。①利用者 → ②職員 → ③訪問介護計画 → ④提供記録 の順に取り込むと、運営指導チェックを通る状態になります。
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {(
            [
              ["①利用者", "userRows", "サンプル_利用者リスト.csv"],
              ["②職員", "staffRows", "サンプル_職員.csv"],
              ["③訪問介護計画", "planRows", "サンプル_訪問介護計画.csv"],
              ["④提供記録", "recordRows", "サンプル_提供記録_記入例.csv"],
            ] as const
          ).map(([label, key, file]) => (
            <button key={key} onClick={() => downloadCSV(file, buildSample()[key])} className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
              {label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
