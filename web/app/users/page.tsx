import Link from "next/link";
import { PageTitle, td, th } from "@/components/ui";
import { getRecords, getUsers } from "@/lib/data";

export default function UsersPage() {
  const records = getRecords();
  return (
    <>
      <PageTitle title="利用者" sub="氏名・被保険者番号はすべて架空" />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["ID", "氏名", "要介護度", "担当ケアマネ", "訪問介護計画", "計画作成／同意", "当月実績", "特記"].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getUsers().map((u) => (
              <tr key={u.id}>
                <td className={td}>{u.id}</td>
                <td className={`${td} whitespace-nowrap`}>
                  <Link href={`/users/${u.id}`} className="font-medium text-teal-700 underline">{u.name}</Link>
                  <div className="text-xs text-slate-500">{u.kana}　{u.sex}・{u.age}歳</div>
                </td>
                <td className={td}>{u.careLevel}</td>
                <td className={`${td} text-xs`}>{u.careManager}（モック）</td>
                <td className={`${td} text-xs`}>
                  {u.plan.map((p, i) => (
                    <div key={i}>{p.weekday} {p.start}〜 {p.code}（{p.minutes}分）</div>
                  ))}
                </td>
                <td className={`${td} whitespace-nowrap text-xs`}>{u.planCreated}<br />{u.planAgreed}</td>
                <td className={td}>{records.filter((r) => r.userId === u.id).length}件</td>
                <td className={`${td} text-xs`}>{u.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
