import { authConfig } from "@/lib/auth";
import type { SP } from "@/lib/filters";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = sp.error === "1";
  const { enabled } = authConfig();
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="mb-1 text-lg font-bold text-teal-700">いいかいご テレッサ</h1>
      <p className="mb-4 text-sm text-slate-500">ログインIDとパスワードを入力してください</p>
      {!enabled && <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-800">ログインはまだ設定されていません（環境変数 LOGIN_USERS が未設定）。</p>}
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">IDまたはパスワードが違います</p>}
      <form method="post" action="/api/auth/login" className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block text-xs text-slate-600">
          ログインID
          <input name="id" autoComplete="username" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs text-slate-600">
          パスワード
          <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button className="w-full rounded bg-teal-700 py-2 text-sm font-medium text-white hover:bg-teal-800">ログイン</button>
      </form>
    </div>
  );
}
