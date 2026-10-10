import Link from "next/link";

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>{children}</section>;
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {note && <div className="mt-1 text-xs text-slate-500">{note}</div>}
    </Card>
  );
}

export function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
      {children}
    </span>
  );
}

export function ButtonLink({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded px-4 py-2 text-sm font-medium ${primary ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {children}
    </Link>
  );
}

export const th = "border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap";
export const td = "border-b border-slate-100 px-2 py-1.5 align-top";
