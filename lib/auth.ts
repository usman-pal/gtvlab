import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, safeEqual } from "./security";
import { db } from "./db";
import { site } from "./site-config";

const COOKIE = "gtl_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

/** The ADMIN_PASSWORD login — always a super admin. */
export const OWNER_ID = "owner";

export type AdminRole = "ADMIN" | "SUPER_ADMIN";
export type AdminIdentity = { id: string; name: string; email: string | null; role: AdminRole };

export function adminPasswordOk(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || (process.env.NODE_ENV === "production" && expected === "change-me")) return false;
  return safeEqual(sign(`pw:${pw}`), sign(`pw:${expected}`));
}

export async function createAdminSession(adminId: string = OWNER_ID) {
  const exp = Date.now() + MAX_AGE * 1000;
  const value = `${exp}.${adminId}.${sign(`admin:${exp}:${adminId}`)}`;
  (await cookies()).set(COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete("gtl_preview");
}

/** The signed-in admin, or null. Named admins are re-checked against the DB so deactivation is immediate. */
export async function getAdmin(): Promise<AdminIdentity | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [exp, id, sig] = v.split(".");
  if (!exp || !id || !sig || Number(exp) < Date.now()) return null;
  if (!safeEqual(sig, sign(`admin:${exp}:${id}`))) return null;
  if (id === OWNER_ID) return { id: OWNER_ID, name: process.env.ADMIN_NAME || site.founder.name, email: null, role: "SUPER_ADMIN" };
  const u = await db.adminUser.findUnique({ where: { id } });
  if (!u || !u.active) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN" };
}

export async function isAdmin(): Promise<boolean> {
  return !!(await getAdmin());
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

export async function requireSuperAdmin(): Promise<AdminIdentity> {
  const a = await requireAdmin();
  if (a.role !== "SUPER_ADMIN") redirect("/admin?denied=1");
  return a;
}
