"use client";

export function PrintButton({ label = "印刷" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
    >
      {label}
    </button>
  );
}
