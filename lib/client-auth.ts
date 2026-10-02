import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { newToken, sign, safeEqual } from "./security";
import { sha256 } from "./passwords";
import { getAdmin } from "./auth";

const COOKIE = "gtl_client";
const PREVIEW = "gtl_preview";
const MAX_AGE = 60 * 60 * 24 * 30;
const PREVIEW_AGE = 60 * 60;

const cookieOpts = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge });

/** DB-backed session: only a hash of the cookie is stored, so logout and password resets revoke it. */
export async function createClientSession(accountId: string) {
  const raw = newToken();
  await db.clientSession.create({ data: { tokenHash: sha256(raw), accountId, expiresAt: new Date(Date.now() + MAX_AGE * 1000) } });
  await db.clientAccount.update({ where: { id: accountId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(COOKIE, raw, cookieOpts(MAX_AGE));
}

export async function destroyClientSession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) await db.clientSession.deleteMany({ where: { tokenHash: sha256(raw) } });
  jar.delete(COOKIE);
}

async function sessionAccount() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const s = await db.clientSession.findUnique({ where: { tokenHash: sha256(raw) }, include: { account: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return s.account;
}

// ---------------------------------------------------------------- super-admin read-only preview

export async function startPreview(leadId: string) {
  const exp = Date.now() + PREVIEW_AGE * 1000;
  (await cookies()).set(PREVIEW, `${leadId}.${exp}.${sign(`preview:${leadId}:${exp}`)}`, cookieOpts(PREVIEW_AGE));
}

export async function endPreview() {
  (await cookies()).delete(PREVIEW);
}

async function previewLeadId(): Promise<string | null> {
  const v = (await cookies()).get(PREVIEW)?.value;
  if (!v) return null;
  const [leadId, exp, sig] = v.split(".");
  if (!leadId || !exp || !sig || Number(exp) < Date.now() || !safeEqual(sig, sign(`preview:${leadId}:${exp}`))) return null;
  const admin = await getAdmin();
  return admin?.role === "SUPER_ADMIN" ? leadId : null;
}

export type PortalViewer = { leadId: string; preview: false; accountId: string; email: string } | { leadId: string; preview: true; accountId: string | null; email: string };

/**
 * Who the portal is rendering for. A valid super-admin preview takes precedence and is
 * strictly read-only: every mutating portal route must reject `preview: true`.
 */
export async function getPortalViewer(): Promise<PortalViewer | null> {
  const pid = await previewLeadId();
  if (pid) {
    const acc = await db.clientAccount.findUnique({ where: { leadId: pid } });
    const lead = await db.lead.findUnique({ where: { id: pid }, select: { email: true } });
    if (lead) return { leadId: pid, preview: true, accountId: acc?.id ?? null, email: acc?.email ?? lead.email };
  }
  const acc = await sessionAccount();
  return acc ? { leadId: acc.leadId, preview: false, accountId: acc.id, email: acc.email } : null;
}

export async function requirePortalViewer(): Promise<PortalViewer> {
  const v = await getPortalViewer();
  if (!v) redirect("/portal/login");
  return v;
}

/** For mutating routes: a real, signed-in client (never a preview). */
export async function requireClient() {
  const v = await getPortalViewer();
  if (!v || v.preview) return null;
  return v;
}
