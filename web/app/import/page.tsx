"use client";

import { useRef } from "react";
import { Card, Field, PageTitle, input, td, th } from "@/components/ui";
import { downloadText } from "@/lib/csv";
import { dateTime } from "@/lib/format";
import { ImportCard, STEPS } from "@/components/ImportCard";
import { TEMPLATES } from "@/lib/importer";
import { useData, type ImportKind } from "@/lib/store";
import type { Dataset } from "@/lib/types";

export default function ImportPage() {
  const { ds, loadMock, clearAll, restore: restoreAll, setOffice } = useData();
  const restoreRef = useRef<HTMLInputElement>(null);

  const backup = () => downloadText(`テレッサ_バックアップ_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(ds), "application/json");
  const restore = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Dataset;
      if (!Array.isArray(data.users) || !Array.isArray(data.records)) throw new Error("バックアップファイルの形式が違います");
      if (!confirm("現在のデータをバックアップの内容で置き換えます。よろしいですか？")) return;
      restoreAll(data);
      alert("復元しました");
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <PageTitle title="データの取り込み" sub="CSV（UTF-8 / Shift_JIS）または Excel（.xlsx）の1枚目のシートを読み込みます" />
      <Card className="mb-4 border-amber-300 bg-amber-50 text-sm">
        <p className="font-medium">取り込んだデータは、この端末のブラウザ（IndexedDB）の中だけに保存され、サーバーには送信されません。</p>
        <p className="mt-1 text-xs text-slate-600">
          別の端末やブラウザでは見えません。ブラウザのデータを消すと失われるため、取り込み後は下の「バックアップ」で保存してください。
          複数の職員で共有する場合は、ログイン付きのデータベース（Firestore）への切り替えが必要です。
        </p>
      </Card>
      <Card className="mb-4">
        <h2 className="mb-2 font-bold">事業所情報（帳票の印字に使います）</h2>
        <form
          key={`${ds.office.corp}|${ds.office.name}|${ds.office.officeNo}`}
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setOffice({ corp: String(f.get("corp")), name: String(f.get("name")), officeNo: String(f.get("officeNo")) });
          }}
        >
          <Field label="法人名"><input name="corp" defaultValue={ds.office.corp} className={input} /></Field>
          <Field label="事業所名"><input name="name" defaultValue={ds.office.name} className={input} /></Field>
          <Field label="事業所番号（10桁）"><input name="officeNo" defaultValue={ds.office.officeNo} className={input} /></Field>
          <button className="rounded bg-teal-700 px-4 py-1.5 text-sm text-white">保存</button>
        </form>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {STEPS.map((st) => <ImportCard key={st.kind} step={st} />)}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold">データの管理</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <button onClick={backup} className="rounded bg-teal-700 px-3 py-1.5 text-white">バックアップ（JSON）を保存</button>
            <button onClick={() => restoreRef.current?.click()} className="rounded border border-slate-300 px-3 py-1.5">バックアップから復元</button>
            <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            <button onClick={() => confirm("今のデータを消して、大規模モック（架空18名・2026年10月・約1,800件）を表示します。よろしいですか？") && loadMock("large")} className="rounded border border-slate-300 px-3 py-1.5">大規模モック（18名・10月）</button>
            <button onClick={() => confirm("今のデータを消して、小規模モック（架空5名・2026年9月）を表示します。よろしいですか？") && loadMock("small")} className="rounded border border-slate-300 px-3 py-1.5">小規模モック（5名・9月）</button>
            <button onClick={() => confirm("すべてのデータを消します。元に戻せません。よろしいですか？") && clearAll()} className="rounded border border-red-300 px-3 py-1.5 text-red-700">すべて消す</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">現在のデータ：{ds.source === "mock" ? `架空のモックデータ（${ds.office.name}）` : "取り込んだデータ"}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">取り込みの履歴</h2>
          {ds.importLogs.length === 0 ? <p className="text-sm text-slate-500">まだありません。</p> : (
            <table className="w-full text-xs">
              <thead><tr>{["日時", "種類", "ファイル", "件数", "方法"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {ds.importLogs.slice(0, 30).map((l, i) => (
                  <tr key={i}>
                    <td className={td}>{dateTime(l.at)}</td>
                    <td className={td}>{TEMPLATES[l.kind as ImportKind]?.title ?? l.kind}</td>
                    <td className={td}>{l.fileName}</td>
                    <td className={td}>{l.rows}</td>
                    <td className={td}>{l.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
