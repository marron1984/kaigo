import { NextResponse, type NextRequest } from "next/server";
import { authConfig, COOKIE, verifySession } from "@/lib/auth";

/** ログインしていなければログイン画面へ。LOGIN_USERS が未設定のときは制限しない */
export async function middleware(req: NextRequest) {
  const { enabled, secret, accounts } = authConfig();
  if (!enabled) return NextResponse.next();
  const id = await verifySession(secret, req.cookies.get(COOKIE)?.value);
  // パスワード変更や削除で無効になったIDのセッションは通さない
  if (id && accounts.some((a) => a.id === id)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
