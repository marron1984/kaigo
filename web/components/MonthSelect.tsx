"use client";

import { useRouter } from "next/navigation";
import { jpMonth } from "@/lib/months";

export function MonthSelect({ months, value, base }: { months: string[]; value: string; base: string }) {
  const router = useRouter();
  if (months.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => router.push(`${base}${base.includes("?") ? "&" : "?"}month=${e.target.value}`)}
      className="no-print rounded border border-slate-300 bg-white px-2 py-2 text-sm"
    >
      {months.map((m) => <option key={m} value={m}>{jpMonth(m)}</option>)}
    </select>
  );
}
