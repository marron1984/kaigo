import Link from "next/link";
import { OFFICE } from "@/lib/master";

const LINKS = [
  { href: "/", label: "ダッシュボード" },
  { href: "/audit", label: "実地調査チェック" },
  { href: "/records", label: "記録一覧" },
  { href: "/users", label: "利用者" },
  { href: "/staff", label: "職員" },
  { href: "/summary", label: "月間集計" },
];

export function Nav() {
  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="bg-red-700 px-4 py-1 text-center text-xs text-white">
        表示中のデータはすべて架空のモックデータです（実地調査準備・研修用）
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-bold text-teal-700">
          いいかいご テレッサ
          <span className="ml-2 text-xs font-normal text-slate-500">{OFFICE.name}</span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded px-3 py-1.5 text-slate-700 hover:bg-teal-50 hover:text-teal-800">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
