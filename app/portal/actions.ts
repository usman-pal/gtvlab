"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { site } from "@/lib/site-config";
import { newToken } from "@/lib/security";
import { hashPassword, verifyPassword, passwordProblem, sha256, rateLimited } from "@/lib/passwords";
import { createClientSession, destroyClientSession, endPreview, requireClient } from "@/lib/client-auth";
import { acceptInvitation, declineInvitation, findInvitation } from "@/lib/programme";
import { sendPasswordReset } from "@/lib/programme-emails";

type State = { error?: string; ok?: string } | null;

async function ip() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
}

// A real hash, so unknown emails take as long as known ones.
let dummyHash: Promise<string> | null = null;

export async function login(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (rateLimited(`login:${email}`, 8, 15 * 60e3) || rateLimited(`login-ip:${await ip()}`, 30, 15 * 60e3))
    return { error: "Too many attempts. Please wait 15 minutes and try again." };
  const account = email ? await db.clientAccount.findUnique({ where: { email } }) : null;
  dummyHash ??= hashPassword("not-a-real-password");
  const ok = await verifyPassword(password, account?.passwordHash ?? (await dummyHash));
  if (!account || !ok) return { error: "That email and password don't match." };
  await createClientSession(account.id);
  redirect("/portal");
}

export async function logout() {
  await destroyClientSession();
  redirect("/portal/login");
}

export async function createAccount(_: State, form: FormData): Promise<State> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password, String(form.get("confirm") ?? ""));
  if (problem) return { error: problem };
  if (rateLimited(`invite:${await ip()}`, 20, 15 * 60e3)) return { error: "Too many attempts. Please try again later." };
  const invite = await findInvitation(token);
  if (!invite) return { error: "This invitation link is no longer valid. Please contact us for a new one." };
  if (await db.clientAccount.findUnique({ where: { email: invite.inviteEmail } }))
    return { error: "An account already exists for this email. Please sign in instead." };
  const r = await acceptInvitation(token, await hashPassword(password));
  if (!r) return { error: "This invitation link is no longer valid. Please contact us for a new one." };
  await createClientSession(r.account.id);
  redirect("/portal?welcome=1");
}

export async function decline(form: FormData) {
  await declineInvitation(String(form.get("token") ?? ""));
  redirect("/portal/invite/declined");
}

export async function requestReset(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const done = { ok: "If an account exists for that email, we've sent a link to reset your password. It expires in 1 hour." };
  if (!email || rateLimited(`reset:${email}`, 3, 60 * 60e3) || rateLimited(`reset-ip:${await ip()}`, 10, 60 * 60e3)) return done;
  const account = await db.clientAccount.findUnique({ where: { email } });
  if (!account) return done;
  const raw = newToken();
  await db.passwordReset.create({ data: { accountId: account.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + 60 * 60e3) } });
  await sendPasswordReset({ leadId: account.leadId, name: account.name, email: account.email }, `${site.url}/portal/reset/${raw}`);
  return done;
}

export async function resetPassword(_: State, form: FormData): Promise<State> {
  const raw = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password, String(form.get("confirm") ?? ""));
  if (problem) return { error: problem };
  const r = await db.passwordReset.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!r || r.usedAt || r.expiresAt < new Date()) return { error: "This reset link has expired. Please request a new one." };
  const claimed = await db.passwordReset.updateMany({ where: { id: r.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return { error: "This reset link has already been used." };
  await db.clientAccount.update({ where: { id: r.accountId }, data: { passwordHash: await hashPassword(password) } });
  // Sign out everywhere, then sign in here.
  await db.clientSession.deleteMany({ where: { accountId: r.accountId } });
  await createClientSession(r.accountId);
  redirect("/portal?reset=1");
}

export async function changePassword(_: State, form: FormData): Promise<State> {
  const viewer = await requireClient();
  if (!viewer) return { error: "Not available in admin preview." };
  const account = await db.clientAccount.findUniqueOrThrow({ where: { id: viewer.accountId } });
  if (!(await verifyPassword(String(form.get("current") ?? ""), account.passwordHash))) return { error: "Your current password is incorrect." };
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password, String(form.get("confirm") ?? ""));
  if (problem) return { error: problem };
  await db.clientAccount.update({ where: { id: account.id }, data: { passwordHash: await hashPassword(password) } });
  await db.clientSession.deleteMany({ where: { accountId: account.id } });
  await createClientSession(account.id);
  return { ok: "Password updated. Other devices have been signed out." };
}

export async function exitPreview(form: FormData) {
  await endPreview();
  const leadId = String(form.get("leadId") ?? "");
  redirect(leadId ? `/admin/leads/${leadId}` : "/admin/strategy");
}
