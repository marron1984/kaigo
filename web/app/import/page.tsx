"use client";

import { useRef, useState } from "react";
import { Card, Field, PageTitle, input, td, th } from "@/components/ui";
import { downloadText } from "@/lib/csv";
import { dateTime } from "@/lib/format";
import { parsePlans, parseRecords, parseStaff, parseUsers, readTable, templateCSV, TEMPLATES, type ParseResult } from "@/lib/importer";
import { useData, type ImportKind } from "@/lib/store";
import type { CarePlan, CareRecord, CareUser, Dataset, ImportLog, Staff } from "@/lib/types";

type AnyRow = CareUser | Staff | CarePlan | CareRecord;

const STEPS: { kind: ImportKind; no: number; note: string; preview: (r: AnyRow) => string[]; cols: string[] }[] = [
  { kind: "users", no: 1, note: "利用者IDがない場合は被保険者番号をIDとして使います。認定有効期間と契約日は運営指導チェックに使います。", cols: ["ID", "氏名", "要介護度", "認定有効期間", "ケアマネ"], preview: (r) => { const u = r as CareUser; return [u.id, u.name, u.careLevel, `${u.certFrom}〜${u.certTo}`, `${u.cmOffice} ${u.careManager}`]; } },
  { kind: "staff", no: 2, note: "資格は「介護福祉士・実務者研修・初任者研修」にそろえます（旧ヘルパー2級は初任者研修）。シフト作成用に、曜日ごとの勤務可能時間（例 9:00-17:00、○＝終日、×＝不可）・週の上限時間・担当しない／担当希望の利用者も取り込めます。", cols: ["ID", "氏名", "資格", "職種", "勤務可能", "週上限"], preview: (r) => { const s = r as Staff; return [s.id, s.name, s.qualification, s.role, s.availability ? Object.entries(s.availability).map(([w, rs]) => `${w}${rs!.map((x) => `${x.from}-${x.to}`).join(",")}`).join(" ") : "制約なし", s.maxWeeklyMinutes ? `${s.maxWeeklyMinutes / 60}h` : "―"]; } },
  { kind: "plans", no: 3, note: "1行に1つのサービス枠（曜日・時間・区分）を書きます。同じ計画の2行目以降は、計画単位の項目（作成日・目標など）を空欄にできます。曜日は「月・水・金」「月〜金」のようにまとめて書けます。", cols: ["計画ID", "利用者", "計画期間", "同意日", "目標数", "サービス枠"], preview: (r) => { const p = r as CarePlan; return [p.id, p.userId, `${p.periodFrom}〜${p.periodTo}`, p.agreedAt || "未", String(p.shortGoals.length + (p.longGoal ? 1 : 0)), p.services.map((s) => `${s.weekday}${s.start}${s.code}`).join("、")]; } },
  { kind: "records", no: 4, note: "このシステムのCSV出力と同じ列で取り込めます。身体介護・生活援助の内容は「・」や「、」で区切ります。", cols: ["記録No", "提供日", "利用者", "時間", "算定区分", "担当"], preview: (r) => { const c = r as CareRecord; return [c.no, c.date, c.userId, `${c.start}〜${c.end}`, c.billingCode, c.staffId]; } },
];

function ImportCard({ step }: { step: (typeof STEPS)[number] }) {
  const { ds, importRows } = useData();
  const [res, setRes] = useState<(ParseResult<AnyRow> & { fileName: string }) | null>(null);
  const [mode, setMode] = useState<ImportLog["mode"]>("追加・更新");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const t = TEMPLATES[step.kind];

  const onFile = async (file: File) => {
    setError(""); setDone(""); setRes(null);
    try {
      const table = await readTable(file);
      const users = ds.source === "mock" ? [] : ds.users;
      const staff = ds.source === "mock" ? [] : ds.staff;
      const r: ParseResult<AnyRow> =
        step.kind === "users" ? parseUsers(table) : step.kind === "staff" ? parseStaff(table) : step.kind === "plans" ? parsePlans(table, users) : parseRecords(table, users, staff);
      setRes({ ...r, fileName: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const doImport = () => {
    if (!res) return;
    if (ds.source === "mock" && !confirm("モックデータを消して、取り込んだデータに切り替えます。よろしいですか？")) return;
    if (mode === "置き換え" && !confirm(`登録済みの${t.title}をすべて消して置き換えます。よろしいですか？`)) return;
    importRows(step.kind, res.rows as never, mode, res.fileName);
    setDone(`${res.rows.length}件を取り込みました`);
    setRes(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const current = ds.source === "mock" ? 0 : (ds[step.kind] as unknown[]).length;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold"><span className="mr-2 rounded bg-teal-700 px-2 py-0.5 text-xs text-white">{step.no}</span>{t.title}</h2>
          <p className="mt-1 text-xs text-slate-500">登録済み {current}件　{step.note}</p>
        </div>
        <button onClick={() => downloadText(`テンプレート_${t.title}.csv`, templateCSV(step.kind), "text/csv;charset=utf-8")} className="rounded border border-slate-300 px-3 py-1.5 text-xs">
          テンプレート（CSV）
        </button>
      </div>
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer">取り込める列</summary>
        <p className="mt-1">{t.fields.map((f) => `${f.label}${f.required ? "（必須）" : ""}`).join("、")}</p>
        <p className="mt-1">見出しの表記ゆれ（例：{t.fields.filter((f) => f.aliases.length).slice(0, 2).map((f) => `${f.aliases[0]}→${f.label}`).join("、")}）にも対応します。日付は西暦・和暦（令和8年10月1日、R8.10.1）どちらでも読めます。</p>
      </details>
      <input ref={fileRef} type="file" accept=".csv,.xlsx" className="mt-3 block text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {done && <p className="mt-2 text-sm text-emerald-700">{done}</p>}
      {res && (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            {res.fileName}：取り込める行 <b>{res.rows.length}件</b>
            {res.errors.length > 0 && <span className="ml-2 text-red-700">エラー {res.errors.length}件（その行は取り込みません）</span>}
            {res.warnings.length > 0 && <span className="ml-2 text-amber-700">注意 {res.warnings.length}件</span>}
          </p>
          {res.unknownHeaders.length > 0 && <p className="text-xs text-slate-500">読み飛ばす列：{res.unknownHeaders.join("、")}</p>}
          {[...res.errors.map((e) => ({ ...e, t: "エラー" })), ...res.warnings.map((e) => ({ ...e, t: "注意" }))].length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded bg-slate-50 p-2 text-xs">
              {res.errors.map((e, i) => <li key={`e${i}`} className="text-red-700">{e.row}行目：{e.message}</li>)}
              {res.warnings.map((e, i) => <li key={`w${i}`} className="text-amber-700">{e.row}行目：{e.message}</li>)}
            </ul>
          )}
          {res.rows.length > 0 && (
            <>
              <div className="max-h-60 overflow-auto rounded border border-slate-200">
                <table className="w-full text-xs">
                  <thead><tr>{step.cols.map((c) => <th key={c} className={th}>{c}</th>)}</tr></thead>
                  <tbody>{res.rows.slice(0, 20).map((r, i) => <tr key={i}>{step.preview(r).map((v, k) => <td key={k} className={td}>{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
              {res.rows.length > 20 && <p className="text-xs text-slate-500">先頭20件を表示</p>}
              <div className="flex flex-wrap items-center gap-3">
                <select value={mode} onChange={(e) => setMode(e.target.value as ImportLog["mode"])} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="追加・更新">追加・更新（同じIDは上書き）</option>
                  <option value="置き換え">置き換え（登録済みを全部消す）</option>
                </select>
                <button onClick={doImport} className="rounded bg-teal-700 px-4 py-1.5 text-sm font-medium text-white">{res.rows.length}件を取り込む</button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

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
        {STEPS.map((s) => <ImportCard key={s.kind} step={s} />)}
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
