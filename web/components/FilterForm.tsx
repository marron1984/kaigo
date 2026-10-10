import { getPeriod, getRecords, getStaff, getUsers } from "@/lib/data";
import type { Filters } from "@/lib/query";

const input = "rounded border border-slate-300 bg-white px-2 py-1.5 text-sm";

export function FilterForm({ f, action }: { f: Filters; action: string }) {
  const period = getPeriod();
  const codes = [...new Set(getRecords().map((r) => r.billingCode))].sort();
  return (
    <form action={action} className="no-print mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <label className="text-xs text-slate-600">
        利用者
        <select name="user" defaultValue={f.user ?? ""} className={`${input} mt-1 block`}>
          <option value="">すべて</option>
          {getUsers().map((u) => (
            <option key={u.id} value={u.id}>{u.id} {u.name}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600">
        担当職員
        <select name="staff" defaultValue={f.staff ?? ""} className={`${input} mt-1 block`}>
          <option value="">すべて</option>
          {getStaff().map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600">
        期間（開始）
        <input type="date" name="from" defaultValue={f.from ?? ""} min={period.from} max={period.to} className={`${input} mt-1 block`} />
      </label>
      <label className="text-xs text-slate-600">
        期間（終了）
        <input type="date" name="to" defaultValue={f.to ?? ""} min={period.from} max={period.to} className={`${input} mt-1 block`} />
      </label>
      <label className="text-xs text-slate-600">
        算定区分
        <select name="code" defaultValue={f.code ?? ""} className={`${input} mt-1 block`}>
          <option value="">すべて</option>
          {codes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600">
        抽出
        <select name="flag" defaultValue={f.flag ?? ""} className={`${input} mt-1 block`}>
          <option value="">なし</option>
          <option value="reported">報告・連絡あり</option>
          <option value="observe">状態変化（要観察）</option>
          <option value="corrected">訂正履歴あり</option>
        </select>
      </label>
      <button className="rounded bg-teal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-800">絞り込む</button>
      <a href={action} className="py-1.5 text-sm text-slate-500 underline">クリア</a>
    </form>
  );
}
