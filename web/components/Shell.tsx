"use client";

import { useData } from "@/lib/store";

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready } = useData();
  if (!ready) return <p className="py-20 text-center text-sm text-slate-500">データを読み込んでいます…</p>;
  return <>{children}</>;
}
