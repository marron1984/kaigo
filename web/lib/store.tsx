"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { runChecks, type Finding } from "./checks";
import { idbDel, idbGet, idbSet } from "./idb";
import { mockDataset } from "./mock";
import { localIso } from "./format";
import { OFFICE } from "./master";
import type { CarePlan, CareRecord, CareReport, CareUser, Dataset, ImportLog, Office, SelfCheckEntry, Staff } from "./types";

const KEY = "dataset-v2";

export type ImportKind = "users" | "plans" | "staff" | "records";
type Rows = { users: CareUser[]; plans: CarePlan[]; staff: Staff[]; records: CareRecord[] };
const KEY_OF: { [K in ImportKind]: (x: Rows[K][number]) => string } = {
  users: (x) => x.id,
  plans: (x) => x.id,
  staff: (x) => x.id,
  records: (x) => x.no,
};

export function emptyDataset(): Dataset {
  return { source: "imported", office: { ...OFFICE }, period: { from: "", to: "" }, users: [], plans: [], staff: [], records: [], reports: [], selfCheck: {}, importLogs: [] };
}

/** 記録のある月の範囲（記録がなければ今月） */
export function periodOf(records: CareRecord[]): { from: string; to: string } {
  if (records.length === 0) {
    const t = new Date();
    const m = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
    return { from: `${m}-01`, to: `${m}-${String(new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()).padStart(2, "0")}` };
  }
  const ds = records.map((r) => r.date).sort();
  return { from: ds[0], to: ds[ds.length - 1] };
}

type Ctx = {
  ds: Dataset;
  ready: boolean;
  findings: Finding[];
  importRows: <K extends ImportKind>(kind: K, rows: Rows[K], mode: ImportLog["mode"], fileName: string) => void;
  saveReport: (r: CareReport) => void;
  setSelfCheck: (id: string, e: SelfCheckEntry) => void;
  loadMock: () => void;
  clearAll: () => void;
  restore: (d: Dataset) => void;
  setOffice: (o: Office) => void;
};

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ds, setDs] = useState<Dataset>(() => mockDataset());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    idbGet<Dataset>(KEY)
      .then((saved) => saved && setDs({ ...saved, office: saved.office ?? { ...OFFICE } }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const commit = useCallback((next: Dataset) => {
    const withPeriod = { ...next, period: periodOf(next.records) };
    setDs(withPeriod);
    idbSet(KEY, withPeriod).catch((e) => alert(`ブラウザへの保存に失敗しました：${e}`));
  }, []);

  const importRows = useCallback<Ctx["importRows"]>(
    (kind, rows, mode, fileName) => {
      const base = ds.source === "mock" ? { ...emptyDataset(), selfCheck: ds.selfCheck } : ds;
      const key = KEY_OF[kind] as (x: unknown) => string;
      const current = base[kind] as unknown[];
      const merged = mode === "置き換え" ? rows : [...current.filter((x) => !rows.some((y) => key(y) === key(x))), ...rows];
      commit({
        ...base,
        source: "imported",
        [kind]: merged,
        importLogs: [{ at: localIso(), kind, fileName, rows: rows.length, mode }, ...base.importLogs],
      });
    },
    [ds, commit],
  );

  const saveReport = useCallback((r: CareReport) => commit({ ...ds, reports: [...ds.reports.filter((x) => x.id !== r.id), r] }), [ds, commit]);
  const setSelfCheck = useCallback((id: string, e: SelfCheckEntry) => commit({ ...ds, selfCheck: { ...ds.selfCheck, [id]: e } }), [ds, commit]);
  const loadMock = useCallback(() => {
    idbDel(KEY).catch(() => {});
    setDs(mockDataset());
  }, []);
  const clearAll = useCallback(() => commit(emptyDataset()), [commit]);
  const setOffice = useCallback((o: Office) => commit({ ...ds, office: o }), [ds, commit]);
  const restore = useCallback((d: Dataset) => commit({ ...emptyDataset(), ...d, source: "imported" }), [commit]);

  const findings = useMemo(() => runChecks(ds), [ds]);
  const value = useMemo(() => ({ ds, ready, findings, importRows, saveReport, setSelfCheck, loadMock, clearAll, restore, setOffice }), [ds, ready, findings, importRows, saveReport, setSelfCheck, loadMock, clearAll, restore, setOffice]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const c = useContext(DataContext);
  if (!c) throw new Error("DataProvider がない");
  return c;
}

/** 参照用のヘルパー */
export function lookup(ds: Dataset) {
  const users = new Map(ds.users.map((u) => [u.id, u]));
  const staff = new Map(ds.staff.map((s) => [s.id, s]));
  return {
    user: (id: string) => users.get(id),
    staff: (id: string | null) => (id ? staff.get(id) : undefined),
    staffName: (id: string | null) => (id ? (staff.get(id)?.name ?? id) : ""),
  };
}
