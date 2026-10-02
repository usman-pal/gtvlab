"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdmin, type AdminIdentity } from "@/lib/auth";
import { startPreview } from "@/lib/client-auth";
import { logEvent } from "@/lib/lifecycle";
import * as prog from "@/lib/programme";

async function guard() {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

const back = (leadId: string, msg: string, err = false): never => {
  revalidatePath(`/admin/leads/${leadId}`);
  redirect(`/admin/leads/${leadId}?${err ? "err" : "msg"}=${encodeURIComponent(msg)}#strategy`);
};

/** Loads the programme for a form and checks this admin may manage it. */
async function managed(form: FormData): Promise<{ admin: AdminIdentity; leadId: string; p: prog.ProgrammeWithStages }> {
  const admin = await guard();
  const leadId = String(form.get("leadId") ?? "");
  const p = await prog.loadProgramme(leadId);
  if (!p) back(leadId, "This applicant hasn't been invited.", true);
  if (!prog.canManage(admin, p)) back(leadId, "This client is assigned to another admin.", true);
  return { admin, leadId, p: p! };
}

async function run(leadId: string, ok: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    back(leadId, e instanceof Error ? e.message : "Something went wrong.", true);
  }
  back(leadId, ok);
}

/** From the invitation modal. Returns a state for useActionState. */
export async function inviteForStrategy(_: unknown, form: FormData): Promise<{ error?: string }> {
  const admin = await guard();
  const leadId = String(form.get("leadId") ?? "");
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "Applicant not found." };
  const existing = await prog.loadProgramme(leadId);
  if (!prog.canManage(admin, existing)) return { error: "This client is assigned to another admin." };
  if (existing?.acceptedAt) return { error: "They've already accepted an invitation." };
  const note = String(form.get("note") ?? "").trim().slice(0, 2000) || null;
  try {
    await prog.inviteLead(lead, admin, note);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't send the invitation." };
  }
  back(leadId, `Invitation sent to ${lead.email}.`);
  return {};
}

export async function resendInvitation(form: FormData) {
  const { admin, leadId, p } = await managed(form);
  const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  await run(leadId, `Invitation re-sent to ${p.inviteEmail}. The previous link no longer works.`, () => prog.inviteLead(lead, admin, null));
}

export async function markInvitationDeclined(form: FormData) {
  const { admin, leadId, p } = await managed(form);
  await run(leadId, "Marked as declined.", () => prog.markDeclined(p, admin));
}

export async function setDriveUrl(form: FormData) {
  const { admin, leadId, p } = await managed(form);
  const raw = String(form.get("driveUrl") ?? "").trim();
  if (raw) {
    let ok = false;
    try {
      const u = new URL(raw);
      ok = u.protocol === "https:" && (u.hostname === "drive.google.com" || u.hostname === "docs.google.com");
    } catch {}
    if (!ok) back(leadId, "Paste a https://drive.google.com/… folder link.", true);
  }
  await db.strategyProgramme.update({ where: { id: p.id }, data: { driveUrl: raw || null } });
  await logEvent(leadId, "DRIVE_WORKSPACE_SET", "admin", admin.name, { set: !!raw });
  back(leadId, raw ? "Google Drive workspace saved." : "Google Drive workspace removed.");
}

export async function completeStageAction(form: FormData) {
  const { admin, leadId, p } = await managed(form);
  const n = Number(form.get("stage"));
  if (n !== 1 && n !== 2 && n !== 3) back(leadId, "Unknown stage.", true);
  await run(leadId, `Stage ${n} marked complete. The client has been notified.`, () => prog.completeStage(p, n as 1 | 2 | 3, admin));
}

export async function unlockStageAction(form: FormData) {
  const { admin, leadId, p } = await managed(form);
  const n = Number(form.get("stage"));
  if (n !== 2 && n !== 4) back(leadId, "Only Stages 2 and 4 can be unlocked manually.", true);
  await run(leadId, `Stage ${n} unlocked. The client has been notified.`, () => prog.unlockStage(p, n as 2 | 4, admin));
}

export async function completeProgrammeAction(form: FormData) {
  const { admin, leadId, p } = await managed(form);
  await run(leadId, "Programme marked complete. The client has been notified.", () => prog.completeProgramme(p, admin));
}

export async function sendPhase2ReminderAction(form: FormData) {
  const { admin, leadId, p } = await managed(form);
  await run(leadId, "Phase 2 payment reminder sent.", () => prog.sendPhase2Reminder(p, admin));
}

export async function assignAdmin(form: FormData) {
  const admin = await guard();
  const leadId = String(form.get("leadId") ?? "");
  if (admin.role !== "SUPER_ADMIN") back(leadId, "Only super admins can reassign clients.", true);
  const to = String(form.get("assignedAdminId") ?? "") || null;
  await db.strategyProgramme.update({ where: { leadId }, data: { assignedAdminId: to } });
  back(leadId, "Assignment updated.");
}

/** Read-only portal preview as this client (super admin only). */
export async function viewAsClient(form: FormData) {
  const admin = await guard();
  const leadId = String(form.get("leadId") ?? "");
  if (admin.role !== "SUPER_ADMIN") back(leadId, "Only super admins can preview client portals.", true);
  await startPreview(leadId);
  redirect("/portal");
}
