"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/lib/store";

const LINKS = [
  { href: "/", label: "ダッシュボード" },
  { href: "/audit", label: "運営指導チェック" },
  { href: "/records", label: "提供記録" },
  { href: "/plans", label: "訪問介護計画" },
  { href: "/reports", label: "介護報告書" },
  { href: "/shifts", label: "シフト" },
  { href: "/users", label: "利用者" },
  { href: "/staff", label: "職員" },
  { href: "/summary", label: "月間集計" },
  { href: "/self-check", label: "自己点検" },
  { href: "/import", label: "取り込み" },
];

export function Nav({ authEnabled = false }: { authEnabled?: boolean }) {
  const { ds, ready } = useData();
  const path = usePathname();
  const mock = ds.source === "mock";
  if (path === "/login") return null;
  return (
    <header className="no-print border-b border-slate-200 bg-white">
      {ready && (
        <div className={`px-4 py-1 text-center text-xs text-white ${mock ? "bg-red-700" : "bg-teal-800"}`}>
          {mock
            ? "表示中のデータはすべて架空のモックデータです（実地調査準備・研修用）"
            : "取り込んだデータを表示中。データはこの端末のブラウザ内だけに保存され、サーバーには送信されません"}
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-bold text-teal-700">
          いいかいご テレッサ
          <span className="ml-2 text-xs font-normal text-slate-500">{ds.office.name}</span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={`rounded px-2.5 py-1.5 ${active ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-teal-50 hover:text-teal-800"}`}>
                {l.label}
              </Link>
            );
          })}
          {authEnabled && (
            <a href="/api/auth/logout" className="rounded px-2.5 py-1.5 text-slate-500 hover:bg-slate-100">ログアウト</a>
          )}
        </nav>
      </div>
    </header>
  );
}
