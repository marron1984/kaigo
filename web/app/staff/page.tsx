import Link from "next/link";
import { PageTitle, td, th } from "@/components/ui";
import { getRecords, getStaff } from "@/lib/data";
import { BODY_QUALIFIED } from "@/lib/master";

export default function StaffPage() {
  const records = getRecords();
  return (
    <>
      <PageTitle title="職員" sub="氏名はすべて架空。資格証の写しは別途保管が必要" />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["ID", "氏名", "職種", "資格", "身体介護", "担当件数", "うち身体介護", "合計時間", ""].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getStaff().map((s) => {
              const rs = records.filter((r) => r.staffId === s.id);
              const min = rs.reduce((a, r) => a + r.minutes, 0);
              return (
                <tr key={s.id}>
                  <td className={td}>{s.id}</td>
                  <td className={`${td} font-medium`}>{s.name}</td>
                  <td className={td}>{s.role}</td>
                  <td className={td}>{s.qualification}</td>
                  <td className={td}>{BODY_QUALIFIED.includes(s.qualification) ? "可" : "不可"}</td>
                  <td className={`${td} tabular-nums`}>{rs.length}件</td>
                  <td className={`${td} tabular-nums`}>{rs.filter((r) => r.body.length > 0).length}件</td>
                  <td className={`${td} tabular-nums`}>{Math.floor(min / 60)}時間{min % 60}分</td>
                  <td className={td}>
                    <Link href={`/records?staff=${s.id}`} className="text-teal-700 underline">記録を見る</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
