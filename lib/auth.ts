import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, safeEqual } from "./security";

const COOKIE = "gtl_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

export function adminPasswordOk(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || (process.env.NODE_ENV === "production" && expected === "change-me")) return false;
  return safeEqual(sign(`pw:${pw}`), sign(`pw:${expected}`));
}

export async function createAdminSession() {
  const exp = Date.now() + MAX_AGE * 1000;
  const value = `${exp}.${sign(`admin:${exp}`)}`;
  (await cookies()).set(COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function destroyAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(`admin:${exp}`));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
