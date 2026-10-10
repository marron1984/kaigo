"use client";

import { useRef, useState } from "react";
import { Card, td, th } from "@/components/ui";
import { downloadText } from "@/lib/csv";
import { parsePlans, parseRecords, parseStaff, parseUsers, readTable, templateCSV, TEMPLATES, type Issue, type ParseResult } from "@/lib/importer";
import { countChanges, type ImportKind, type Rows } from "@/lib/merge";
import { lookup, useData } from "@/lib/store";
import type { CarePlan, CareRecord, CareUser, ImportLog, Staff } from "@/lib/types";

type AnyRow = CareUser | Staff | CarePlan | CareRecord;

export type Step = { kind: ImportKind; no: number; note: string; preview: (r: AnyRow) => string[]; cols: string[] };

export const STEPS: Step[] = [
  { kind: "users", no: 1, note: "利用者IDがない場合は被保険者番号をIDとして使います。認定有効期間と契約日は運営指導チェックに使います。", cols: ["ID", "氏名", "要介護度", "認定有効期間", "ケアマネ"], preview: (r) => { const u = r as CareUser; return [u.id, u.name, u.careLevel, `${u.certFrom}〜${u.certTo}`, `${u.cmOffice} ${u.careManager}`]; } },
  { kind: "staff", no: 2, note: "資格は「介護福祉士・実務者研修・初任者研修」にそろえます（旧ヘルパー2級は初任者研修）。シフト作成用に、曜日ごとの勤務可能時間（例 9:00-17:00、○＝終日、×＝不可）・週の上限時間・担当しない／担当希望の利用者も取り込めます。", cols: ["ID", "氏名", "資格", "職種", "勤務可能", "週上限"], preview: (r) => { const s = r as Staff; return [s.id, s.name, s.qualification, s.role, s.availability ? Object.entries(s.availability).map(([w, rs]) => `${w}${rs!.map((x) => `${x.from}-${x.to}`).join(",")}`).join(" ") : "制約なし", s.maxWeeklyMinutes ? `${s.maxWeeklyMinutes / 60}h` : "―"]; } },
  { kind: "plans", no: 3, note: "1行に1つのサービス枠（曜日・時間・区分）を書きます。同じ計画の2行目以降は、計画単位の項目（作成日・目標など）を空欄にできます。曜日は「月・水・金」「月〜金」のようにまとめて書けます。", cols: ["計画ID", "利用者", "計画期間", "同意日", "目標数", "サービス枠"], preview: (r) => { const p = r as CarePlan; return [p.id, p.userId, `${p.periodFrom}〜${p.periodTo}`, p.agreedAt || "未", String(p.shortGoals.length + (p.longGoal ? 1 : 0)), p.services.map((s) => `${s.weekday}${s.start}${s.code}`).join("、")]; } },
  { kind: "records", no: 4, note: "このシステムのCSV出力と同じ列で取り込めます。複数のファイルやExcelの複数シートもまとめて読めます。同じ利用者・同じ日・同じ開始時刻の記録は上書きされ、二重には登録されません。", cols: ["記録No", "提供日", "利用者", "時間", "算定区分", "担当"], preview: (r) => { const c = r as CareRecord; return [c.no, c.date, c.userId, `${c.start}〜${c.end}`, c.billingCode, c.staffId]; } },
];

type Result = ParseResult<AnyRow> & { fileNames: string[] };

function parseOne(kind: ImportKind, table: string[][], users: CareUser[], staff: Staff[]): ParseResult<AnyRow> {
  if (kind === "users") return parseUsers(table);
  if (kind === "staff") return parseStaff(table);
  if (kind === "plans") return parsePlans(table, users);
  return parseRecords(table, users, staff);
}

/** CSV / Excel を読み込む入口（ファイル選択・ドラッグ＆ドロップ、複数ファイル対応） */
export function ImportCard({ step, title }: { step: Step; title?: string }) {
  const { ds, importRows } = useData();
  const L = lookup(ds);
  const [res, setRes] = useState<Result | null>(null);
  const [mode, setMode] = useState<ImportLog["mode"]>("追加・更新");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = TEMPLATES[step.kind];
  const mock = ds.source === "mock";

  const onFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setError(""); setDone(""); setRes(null); setBusy(true);
    try {
      const users = mock ? [] : ds.users;
      const staff = mock ? [] : ds.staff;
      const merged: Result = { rows: [], errors: [], warnings: [], unknownHeaders: [], fileNames: [] };
      for (const f of files) {
        const r = parseOne(step.kind, await readTable(f), users, staff);
        const tag = (i: Issue) => ({ ...i, message: files.length > 1 ? `［${f.name}］${i.message}` : i.message });
        merged.rows.push(...r.rows);
        merged.errors.push(...r.errors.map(tag));
        merged.warnings.push(...r.warnings.map(tag));
        merged.unknownHeaders.push(...r.unknownHeaders.filter((h) => !merged.unknownHeaders.includes(h)));
        merged.fileNames.push(f.name);
      }
      setRes(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const doImport = () => {
    if (!res) return;
    if (mock && !confirm("モックデータを消して、取り込んだデータに切り替えます。よろしいですか？")) return;
    if (mode === "置き換え" && !confirm(`登録済みの${t.title}をすべて消して置き換えます。よろしいですか？`)) return;
    importRows(step.kind, res.rows as never, mode, res.fileNames.join("、"));
    setDone(`${res.rows.length}件を取り込みました`);
    setRes(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const current = mock ? 0 : (ds[step.kind] as unknown[]).length;
  const changes = res ? countChanges(step.kind, (mock ? [] : ds[step.kind]) as Rows[typeof step.kind], res.rows as never) : null;
  const recSummary = res && step.kind === "records" ? summarizeRecords(res.rows as CareRecord[], (id) => L.user(id)?.name ?? id) : null;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">
            {!title && <span className="mr-2 rounded bg-teal-700 px-2 py-0.5 text-xs text-white">{step.no}</span>}
            {title ?? t.title}
          </h2>
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

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
        className={`mt-3 rounded-lg border-2 border-dashed p-4 text-center text-sm ${over ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}
      >
        <p className="text-slate-600">ここに CSV / Excel ファイルをドラッグ＆ドロップ（複数可）</p>
        <p className="my-1 text-xs text-slate-400">または</p>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" multiple className="mx-auto block text-sm" onChange={(e) => onFiles([...(e.target.files ?? [])])} />
      </div>
      {busy && <p className="mt-2 text-sm text-slate-500">読み込んでいます…</p>}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {done && <p className="mt-2 text-sm text-emerald-700">{done}</p>}

      {res && (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            {res.fileNames.join("、")}：取り込める行 <b>{res.rows.length}件</b>
            {changes && <span className="ml-2 text-slate-600">（新規 {changes.added}件／上書き {changes.updated}件）</span>}
            {res.errors.length > 0 && <span className="ml-2 text-red-700">エラー {res.errors.length}件（その行は取り込みません）</span>}
            {res.warnings.length > 0 && <span className="ml-2 text-amber-700">注意 {res.warnings.length}件</span>}
          </p>
          {recSummary && (
            <div className="rounded bg-sky-50 p-2 text-xs text-slate-700">
              <div>期間：{recSummary.from} 〜 {recSummary.to}　利用者 {recSummary.users.length}名　合計 {recSummary.units.toLocaleString("ja-JP")}単位</div>
              <div className="mt-1">{recSummary.users.map(([n, c]) => `${n} ${c}件`).join("、")}</div>
            </div>
          )}
          {res.unknownHeaders.length > 0 && <p className="text-xs text-slate-500">読み飛ばす列：{res.unknownHeaders.join("、")}</p>}
          {res.errors.length + res.warnings.length > 0 && (
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
                  <option value="追加・更新">{step.kind === "records" ? "追加・更新（同じ訪問は上書き）" : "追加・更新（同じIDは上書き）"}</option>
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

function summarizeRecords(rows: CareRecord[], nameOf: (id: string) => string) {
  const dates = rows.map((r) => r.date).sort();
  const byUser = new Map<string, number>();
  for (const r of rows) byUser.set(nameOf(r.userId), (byUser.get(nameOf(r.userId)) ?? 0) + 1);
  return { from: dates[0] ?? "", to: dates[dates.length - 1] ?? "", units: rows.reduce((s, r) => s + r.units, 0), users: [...byUser] };
}
