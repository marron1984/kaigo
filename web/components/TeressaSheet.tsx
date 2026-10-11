"use client";

import { timeRate } from "@/lib/billing";
import { dateTime, jpDate, slashDate } from "@/lib/format";
import { BODY_ITEMS, LEAVE_ITEMS, LIFE_ITEMS } from "@/lib/master";
import { lookup, useData } from "@/lib/store";
import type { CareRecord } from "@/lib/types";

const L = "border border-slate-800 bg-slate-100 px-1.5 py-1 text-center font-semibold whitespace-nowrap";
const V = "border border-slate-800 px-1.5 py-1";

function Checks({ items, checked }: { items: string[]; checked: string[] }) {
  return (
    <div className="grid grid-cols-4 border-l border-t border-slate-800">
      {items.map((i) => (
        <div key={i} className="border-b border-r border-slate-800 px-1.5 py-1">
          <span className={checked.includes(i) ? "font-bold text-teal-800" : "text-slate-500"}>{checked.includes(i) ? "☑" : "□"}</span> {i}
        </div>
      ))}
      {Array.from({ length: (4 - (items.length % 4)) % 4 }).map((_, k) => (
        <div key={k} className="border-b border-r border-slate-800" />
      ))}
    </div>
  );
}

/** 訪問介護サービス提供記録（テレッサ）1枚分。A4縦1ページで印刷される。 */
export function TeressaSheet({ r }: { r: CareRecord }) {
  const { ds } = useData();
  const L0 = lookup(ds);
  const u = L0.user(r.userId);
  const staff = L0.staff(r.staffId);
  const sv = L0.staff(r.supervisorCheckedBy);
  const userName = u?.name ?? r.userId;
  return (
    <article className="sheet mx-auto mb-6 w-full max-w-[190mm] bg-white p-6 text-[12px] leading-snug shadow print:p-0">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-bold tracking-wide">訪問介護サービス提供記録（テレッサ）</h2>
        <div className="text-right">No. {r.no}</div>
      </div>
      <div className="mt-1 text-[11px]">
        {ds.office.corp}　{ds.office.name}　事業所番号 {ds.office.officeNo || "未設定"}
      </div>
      {ds.source === "mock" ? <div className="mb-2 text-[10px] text-red-700">※架空のモックデータ（実地調査準備・研修用）</div> : <div className="mb-2" />}

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className={L}>利用者名</td>
            <td className={V} colSpan={2}>{userName} 様</td>
            <td className={L}>要介護度</td>
            <td className={V}>{u?.careLevel}</td>
            <td className={L}>被保険者番号</td>
            <td className={V} colSpan={2}>{u?.insuredNo}{ds.source === "mock" && "（モック）"}</td>
          </tr>
          <tr>
            <td className={L}>提供日</td>
            <td className={V} colSpan={2}>{jpDate(r.date)}</td>
            <td className={L}>提供時間</td>
            <td className={V} colSpan={2}>
              {r.start} 〜 {r.end}（{r.minutes}分）
              {r.bodyMinutes !== undefined && <span className="text-[10px]">　うち身体{r.bodyMinutes}分</span>}
            </td>
            <td className={L}>算定区分</td>
            <td className={V}>{r.billingCode}</td>
          </tr>
          <tr>
            <td className={L}>計画区分</td>
            <td className={V} colSpan={2}>{r.planCode}</td>
            <td className={L}>単位数</td>
            <td className={V}>{r.units}単位{timeRate(r.start).label && <span className="text-[10px]">（{timeRate(r.start).label}）</span>}</td>
            <td className={L}>派遣人数</td>
            <td className={V} colSpan={2}>{r.helpers}名</td>
          </tr>
          <tr>
            <td className={L}>体温</td>
            <td className={V}>{r.vitals.temp != null ? `${r.vitals.temp.toFixed(1)}℃` : "―"}</td>
            <td className={L}>血圧</td>
            <td className={V}>{r.vitals.bp || "―"}</td>
            <td className={L}>脈拍</td>
            <td className={V}>{r.vitals.pulse != null ? `${r.vitals.pulse}回/分` : "―"}</td>
            <td className={L}>顔色・様子</td>
            <td className={V}>{r.condition}</td>
          </tr>
          <tr>
            <td className={L}>食事摂取</td>
            <td className={V} colSpan={3}>{r.meal}</td>
            <td className={L}>排泄</td>
            <td className={V} colSpan={3}>{r.excretion}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-2 border border-b-0 border-slate-800 bg-sky-100 px-1.5 py-1 font-semibold">■ 身体介護</div>
      <Checks items={BODY_ITEMS} checked={r.body} />
      <div className="mt-2 border border-b-0 border-slate-800 bg-sky-100 px-1.5 py-1 font-semibold">■ 生活援助</div>
      <Checks items={LIFE_ITEMS} checked={r.life} />

      {r.serviceDetail && (
        <div className="border border-t-0 border-slate-800 px-1.5 py-1 text-[11px]">
          <span className="font-semibold">サービス内容（記述）：</span>
          {r.serviceDetail}
        </div>
      )}
      <div className="mt-2 border border-b-0 border-slate-800 bg-sky-100 px-1.5 py-1 font-semibold">■ 利用者の状態・サービス提供時の特記事項</div>
      <div className="min-h-[38mm] border border-slate-800 p-2 text-[13px]">{r.note}</div>

      <table className="mt-2 w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${L} w-[22mm]`}>報告・連絡</td>
            <td className={V} colSpan={3}>{r.reported ? `あり（${r.reportTo}へ報告済）` : "なし"}</td>
          </tr>
          <tr>
            <td className={L}>退室時確認</td>
            <td className={V} colSpan={3}>
              {LEAVE_ITEMS.map((i) => (
                <span key={i} className="mr-3">
                  {r.leaveCheck.includes(i) ? "☑" : "□"} {i}
                </span>
              ))}
            </td>
          </tr>
          <tr>
            <td className={L}>担当ヘルパー</td>
            <td className={V}>{staff ? `${staff.name}（${staff.qualification}）` : r.staffId || "―"}</td>
            <td className={`${L} w-[22mm]`}>サ責確認</td>
            <td className={V}>{r.supervisorCheckedAt ? `${sv?.name ?? ""}　${dateTime(r.supervisorCheckedAt)}` : "未確認"}</td>
          </tr>
          <tr>
            <td className={`${L} h-[12mm]`}>利用者確認</td>
            <td className={V}>{r.userConfirmed ? `${userName}（署名${ds.source === "mock" ? "・モック" : "済"}）` : "未確認"}</td>
            <td className={L}>確認日時</td>
            <td className={V}>{r.userConfirmed ? `${slashDate(r.date)} ${r.end}` : "―"}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-1 text-right text-[10px] text-slate-500">
        記録作成 {dateTime(r.createdAt)}
        {r.history.length > 0 && `　／ 訂正 ${r.history.length}件（訂正履歴は記録詳細画面を参照）`}
      </div>
    </article>
  );
}
