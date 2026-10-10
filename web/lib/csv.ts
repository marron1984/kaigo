const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replaceAll('"', '""')}"`;

/** Excel で文字化けしないよう BOM 付き UTF-8 の CSV をダウンロードさせる */
export function downloadCSV(fileName: string, rows: (string | number | null | undefined)[][]) {
  const body = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  downloadText(fileName, body, "text/csv;charset=utf-8");
}

export function downloadText(fileName: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
