import { yenOf } from "@/lib/billing";
import { getStaffById, getUser } from "@/lib/data";
import { UNIT_PRICE } from "@/lib/master";
import { readFilters, selectRecords } from "@/lib/query";

const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;

export function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const rs = selectRecords(readFilters(sp));
  const head = ["記録No", "提供日", "利用者ID", "利用者名", "計画区分", "開始", "終了", "提供分", "算定区分", "単位数", "金額", "身体介護", "生活援助", "担当職員", "特記事項", "報告先", "利用者確認", "サ責確認日時", "訂正件数"];
  const lines = rs.map((r) =>
    [
      r.no, r.date, r.userId, getUser(r.userId)?.name ?? "", r.planCode, r.start, r.end, r.minutes, r.billingCode, r.units,
      yenOf(r.units, UNIT_PRICE), r.body.join("・"), r.life.join("・"), getStaffById(r.staffId)?.name ?? "", r.note,
      r.reportTo, r.userConfirmed ? "済" : "未", r.supervisorCheckedAt ?? "", r.history.length,
    ].map(esc).join(","),
  );
  // Excel で文字化けしないよう BOM 付き UTF-8
  const body = "﻿" + [head.map(esc).join(","), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("テレッサ記録_モック.csv")}`,
    },
  });
}
