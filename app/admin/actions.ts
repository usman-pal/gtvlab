"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminPasswordOk, createAdminSession, destroyAdminSession, getAdmin, OWNER_ID } from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";
import { setStatus, fulfilPayment } from "@/lib/leads";
import { products, publicProducts, LEAD_STATUSES, type ProductKey } from "@/lib/site-config";

async function guard() {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

async function superGuard() {
  const a = await guard();
  if (a.role !== "SUPER_ADMIN") redirect("/admin?denied=1");
  return a;
}

const loginAttempts = new Map<string, number[]>();

export async function login(_: unknown, form: FormData) {
  const now = Date.now();
  const k = "global";
  const recent = (loginAttempts.get(k) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  if (recent.length >= 20) return { error: "Too many attempts. Try again later." };
  recent.push(now);
  loginAttempts.set(k, recent);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (email) {
    // Named admin accounts (created by a super admin under Team)
    const u = await db.adminUser.findUnique({ where: { email } });
    if (!u || !u.active || !(await verifyPassword(password, u.passwordHash))) return { error: "Incorrect email or password." };
    await db.adminUser.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });
    await createAdminSession(u.id);
  } else {
    // Owner login (ADMIN_PASSWORD) — always super admin
    if (!adminPasswordOk(password)) return { error: "Incorrect password." };
    await createAdminSession(OWNER_ID);
  }
  redirect("/admin");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function changeStatus(form: FormData) {
  await guard();
  const id = String(form.get("id"));
  const to = String(form.get("status"));
  if (!LEAD_STATUSES.some((s) => s.value === to)) return;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return;
  await setStatus(lead, to, "admin");
  // Keep lifecycle timestamps in step with manual pipeline updates
  if (to === "FULL_SERVICE_PURCHASED" && !lead.fullServicePurchasedAt) await db.lead.update({ where: { id }, data: { fullServicePurchasedAt: new Date() } });
  if (to === "AUDIT_PURCHASED" && !lead.auditPurchasedAt) await db.lead.update({ where: { id }, data: { auditPurchasedAt: new Date() } });
  revalidatePath(`/admin/leads/${id}`);
}

export async function addNote(form: FormData) {
  await guard();
  const id = String(form.get("id"));
  const body = String(form.get("body") ?? "").trim().slice(0, 5000);
  if (body) await db.note.create({ data: { leadId: id, body } });
  revalidatePath(`/admin/leads/${id}`);
}

/** Record a payment taken outside Stripe (bank transfer etc.) so revenue & attribution stay complete. */
export async function recordManualPayment(form: FormData) {
  await guard();
  const id = String(form.get("id"));
  const product = String(form.get("product")) as ProductKey;
  const amount = Math.round(Number(form.get("amount")) * 100);
  if (!products[product] || !Number.isFinite(amount) || amount <= 0) return;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return;
  const p = await db.payment.create({
    data: { leadId: id, product, amountPence: amount, provider: "manual", customerEmail: lead.email, utmSource: lead.utmSource, utmCampaign: lead.utmCampaign, note: String(form.get("note") ?? "").slice(0, 300) || null },
  });
  await fulfilPayment(p.id, "admin");
  revalidatePath(`/admin/leads/${id}`);
}

export async function markMessageSent(form: FormData) {
  await guard();
  const id = String(form.get("id"));
  const m = await db.message.update({ where: { id }, data: { status: "sent", sentAt: new Date() } });
  revalidatePath(`/admin/leads/${m.leadId}`);
}

export async function addSpend(form: FormData) {
  await superGuard();
  const utmSource = String(form.get("utmSource") ?? "").trim().toLowerCase();
  const amount = Math.round(Number(form.get("amount")) * 100);
  if (!utmSource || !Number.isFinite(amount) || amount <= 0) return;
  const d = (k: string) => {
    const v = String(form.get(k) ?? "");
    return v ? new Date(`${v}T00:00:00.000Z`) : null;
  };
  await db.spend.create({
    data: { utmSource, utmCampaign: String(form.get("utmCampaign") ?? "").trim() || null, amountPence: amount, periodStart: d("periodStart"), periodEnd: d("periodEnd"), note: String(form.get("note") ?? "").slice(0, 200) || null },
  });
  revalidatePath("/admin/campaigns");
}

export async function deleteSpend(form: FormData) {
  await superGuard();
  await db.spend.delete({ where: { id: String(form.get("id")) } }).catch(() => null);
  revalidatePath("/admin/campaigns");
}

// ---------------------------------------------------------------- discount codes

export async function createDiscount(_: unknown, form: FormData): Promise<{ error?: string; ok?: string }> {
  await superGuard();
  const { normaliseCode } = await import("@/lib/discounts");
  const code = normaliseCode(form.get("code"));
  const percent = Math.round(Number(form.get("percentOff")));
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { error: "Code must be 3–40 letters, numbers, - or _." };
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) return { error: "Discount must be between 1 and 100%." };
  const picked = form.getAll("products").map(String).filter((p) => publicProducts.some((x) => x.key === p));
  const maxRaw = String(form.get("maxUses") ?? "").trim();
  const maxUses = maxRaw ? Math.round(Number(maxRaw)) : null;
  if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) return { error: "Max uses must be 1 or more (or blank for unlimited)." };
  const exp = String(form.get("expiresAt") ?? "");
  if (await db.discountCode.findUnique({ where: { code } })) return { error: `${code} already exists.` };
  await db.discountCode.create({
    data: {
      code,
      percentOff: percent,
      products: picked.length && picked.length < publicProducts.length ? picked.join(",") : null,
      maxUses,
      expiresAt: exp ? new Date(`${exp}T23:59:59.999Z`) : null,
      note: String(form.get("note") ?? "").trim().slice(0, 200) || null,
    },
  });
  revalidatePath("/admin/discounts");
  return { ok: `${code} created.` };
}

export async function toggleDiscount(form: FormData) {
  await superGuard();
  const id = String(form.get("id"));
  const d = await db.discountCode.findUnique({ where: { id } });
  if (d) await db.discountCode.update({ where: { id }, data: { active: !d.active } });
  revalidatePath("/admin/discounts");
}
