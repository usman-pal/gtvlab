"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { hashPassword, passwordProblem } from "@/lib/passwords";

async function superGuard() {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  if (a.role !== "SUPER_ADMIN") redirect("/admin?denied=1");
  return a;
}

const back = (k: "msg" | "err", v: string): never => {
  revalidatePath("/admin/team");
  redirect(`/admin/team?${k}=${encodeURIComponent(v)}`);
};

export async function createAdminUser(form: FormData) {
  await superGuard();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role")) === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) back("err", "Enter a name and a valid email.");
  const problem = passwordProblem(password);
  if (problem) back("err", problem);
  if (await db.adminUser.findUnique({ where: { email } })) back("err", `${email} already has an admin login.`);
  await db.adminUser.create({ data: { name, email, role, passwordHash: await hashPassword(password) } });
  back("msg", `${name} added. They sign in at /admin/login with their email and the temporary password.`);
}

export async function toggleAdminUser(form: FormData) {
  await superGuard();
  const u = await db.adminUser.findUnique({ where: { id: String(form.get("id")) } });
  if (u) await db.adminUser.update({ where: { id: u.id }, data: { active: !u.active } });
  back("msg", u ? `${u.name} ${u.active ? "disabled" : "enabled"}.` : "Not found.");
}
