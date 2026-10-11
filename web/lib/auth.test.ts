import { describe, expect, it } from "vitest";
import { authConfig, checkLogin, parseAccounts, signSession, verifySession } from "./auth";

describe("ログイン", () => {
  it("LOGIN_USERS を読み取る（パスワードに : を含んでもよい）", () => {
    expect(parseAccounts("staff01:abc, staff02:x:y ,bad,:nopass")).toEqual([{ id: "staff01", password: "abc" }, { id: "staff02", password: "x:y" }]);
    expect(authConfig({}).enabled).toBe(false);
    expect(authConfig({ LOGIN_USERS: "a:b" }).enabled).toBe(true);
  });
  it("IDとパスワードの照合", () => {
    const acc = parseAccounts("staff01:pass1");
    expect(checkLogin(acc, "staff01", "pass1")).toBe(true);
    expect(checkLogin(acc, "staff01", "pass2")).toBe(false);
    expect(checkLogin(acc, "staff0", "pass1")).toBe(false);
  });
  it("署名付きセッション（改ざん・期限切れ・鍵違いは無効）", async () => {
    const t = await signSession("secret", "staff01", 1_000);
    expect(await verifySession("secret", t, 2_000)).toBe("staff01");
    expect(await verifySession("other", t, 2_000)).toBeNull();
    expect(await verifySession("secret", t.replace("staff01", "admin"), 2_000)).toBeNull();
    expect(await verifySession("secret", t, 1_000 + 13 * 3600 * 1000)).toBeNull();
    expect(await verifySession("secret", undefined)).toBeNull();
  });
});
