import { NextResponse } from "next/server";
import { authConfig, checkLogin, COOKIE, SESSION_HOURS, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { enabled, accounts, secret } = authConfig();
  const form = await req.formData();
  const id = String(form.get("id") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const base = new URL(req.url);
  if (!enabled) return NextResponse.redirect(new URL(safeNext, base), 303);
  if (!checkLogin(accounts, id, password)) {
    await new Promise((r) => setTimeout(r, 800)); // 総当たり対策で少し待たせる
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(safeNext)}`, base), 303);
  }
  const res = NextResponse.redirect(new URL(safeNext, base), 303);
  res.cookies.set(COOKIE, await signSession(secret, id), {
    httpOnly: true, secure: base.protocol === "https:", sameSite: "lax", path: "/", maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
