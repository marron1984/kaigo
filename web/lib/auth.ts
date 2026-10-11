/**
 * ログイン（ID・パスワード）。
 * 認証情報はコードに書かず、環境変数 LOGIN_USERS に「ID:パスワード」をカンマ区切りで設定する（例：staff01:xxxx,staff02:yyyy）。
 * セッションは署名付きクッキー（HttpOnly）。署名鍵は AUTH_SECRET（未設定なら LOGIN_USERS から作る）。
 * Edge（ミドルウェア）と Node のどちらでも動くよう Web Crypto を使う。
 */
export const COOKIE = "teressa_session";
export const SESSION_HOURS = 12;

export type Account = { id: string; password: string };

export function parseAccounts(raw: string | undefined): Account[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(":");
      return i > 0 ? { id: s.slice(0, i).trim(), password: s.slice(i + 1) } : null;
    })
    .filter((a): a is Account => !!a && !!a.id && !!a.password);
}

export function authConfig(env: Record<string, string | undefined> = process.env) {
  const accounts = parseAccounts(env.LOGIN_USERS);
  return { enabled: accounts.length > 0, accounts, secret: env.AUTH_SECRET || env.LOGIN_USERS || "" };
}

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 長さの違いも含めて一定時間で比較する */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function checkLogin(accounts: Account[], id: string, password: string): boolean {
  let ok = false;
  for (const a of accounts) if (safeEqual(a.id, id) && safeEqual(a.password, password)) ok = true;
  return ok;
}

export async function signSession(secret: string, id: string, now = Date.now()): Promise<string> {
  const payload = `${encodeURIComponent(id)}.${now + SESSION_HOURS * 3600 * 1000}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

/** 有効なセッションならログインIDを返す */
export async function verifySession(secret: string, token: string | undefined, now = Date.now()): Promise<string | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  if (!safeEqual(await hmac(secret, `${id}.${exp}`), sig)) return null;
  if (!(Number(exp) > now)) return null;
  return decodeURIComponent(id);
}
