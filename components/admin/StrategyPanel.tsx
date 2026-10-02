import type { ClientAccount, Lead, Payment } from "@prisma/client";
import type { AdminIdentity } from "@/lib/auth";
import { canManage, revenueBreakdown, type ProgrammeWithStages } from "@/lib/programme";
import { inviteUrl } from "@/lib/programme-emails";
import { formatGBP } from "@/lib/site-config";
import { STAGES, PROGRAMME_NAME, PHASE_1_PENCE, PHASE_2_PENCE, PROGRAMME_TOTAL_PENCE, deriveStatus, programmeStatusLabel, stageStatusLabel, stageDone, progressPercent } from "@/lib/programme-content";
import InviteModal from "./InviteModal";
import CopyLink from "./CopyLink";
import ConfirmSubmit from "./ConfirmSubmit";
import {
  resendInvitation, markInvitationDeclined, setDriveUrl, completeStageAction, unlockStageAction,
  completeProgrammeAction, sendPhase2ReminderAction, assignAdmin, viewAsClient,
} from "@/app/admin/strategy-actions";

const dt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace("T", " ") : "—");

export function inviteProps(lead: Lead) {
  return {
    leadId: lead.id,
    name: lead.name,
    email: lead.email,
    programme: PROGRAMME_NAME,
    total: formatGBP(PROGRAMME_TOTAL_PENCE),
    structure: `${formatGBP(PHASE_1_PENCE)} to start + ${formatGBP(PHASE_2_PENCE)} before Stage 3`,
    warning: lead.reviewCompletedAt ? undefined : "This applicant's Eligibility Review isn't marked completed yet.",
  };
}

const Hidden = ({ leadId, stage }: { leadId: string; stage?: number }) => (
  <>
    <input type="hidden" name="leadId" value={leadId} />
    {stage && <input type="hidden" name="stage" value={stage} />}
  </>
);

export default function StrategyPanel({
  lead,
  programme: p,
  account,
  payments,
  admin,
  admins,
}: {
  lead: Lead;
  programme: ProgrammeWithStages | null;
  account: ClientAccount | null;
  payments: Payment[];
  admin: AdminIdentity;
  admins: { id: string; name: string }[];
}) {
  const rev = revenueBreakdown(payments);
  const manage = canManage(admin, p);

  if (!p) {
    return (
      <div className="card" id="strategy" style={{ marginTop: 16 }}>
        <h3>Application Strategy</h3>
        <p className="small muted" style={{ margin: "0 0 12px" }}>Not invited. Invite applicants whose Eligibility Review shows a credible route forward.</p>
        {manage && <InviteModal {...inviteProps(lead)} />}
      </div>
    );
  }

  const status = deriveStatus(p);
  const stage = (n: number) => p.stages.find((s) => s.number === n)!;
  const open = (n: number) => ["AVAILABLE", "BOOKED"].includes(stage(n).status);
  const inviteLive = !p.acceptedAt && !!p.inviteToken && status === "INVITED";
  const assigned = admins.find((a) => a.id === p.assignedAdminId)?.name;

  const inviteState = p.acceptedAt ? `Accepted ${dt(p.acceptedAt)}` : status === "EXPIRED" ? `Expired ${dt(p.inviteExpiresAt)}` : status === "DECLINED" ? `Declined ${dt(p.declinedAt)}` : `Sent — expires ${dt(p.inviteExpiresAt)}`;

  return (
    <div className="card" id="strategy" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>Application Strategy</h3>
        <span className="small">
          <span className={`badge ${status === "COMPLETED" ? "done" : ["DECLINED", "EXPIRED"].includes(status) ? "locked" : "current"}`}>{programmeStatusLabel(status)}</span>{" "}
          <span className="muted">· {progressPercent(p)}% complete</span>
        </span>
      </div>

      <div className="grid g2" style={{ marginTop: 14, alignItems: "start" }}>
        <dl className="prog-grid">
          <dt>Invitation</dt>
          <dd>
            {inviteState}
            <div className="xs muted">Sent {dt(p.invitedAt)} by {p.invitedByName ?? "—"} to {p.inviteEmail}{p.inviteSentCount > 1 ? ` · sent ${p.inviteSentCount}×` : ""}</div>
          </dd>
          <dt>Portal account</dt><dd>{account ? `Created ${dt(account.createdAt)}` : "Not created"}{account?.lastLoginAt && <div className="xs muted">Last sign-in {dt(account.lastLoginAt)}</div>}</dd>
          <dt>Phase 1</dt><dd>{p.phase1PaidAt ? <>£999 Paid <span className="muted xs">{dt(p.phase1PaidAt)}</span></> : "Unpaid"}</dd>
          {[1, 2].map((n) => (
            <StageRow key={n} n={n} p={p} paid={!!p.phase1PaidAt} />
          ))}
          <dt>Writer add-on</dt>
          <dd>{p.writerPaidAt ? <>£250 Paid <span className="muted xs">{dt(p.writerPaidAt)}</span></> : "Not purchased"}</dd>
          <dt>Phase 2</dt><dd>{p.phase2PaidAt ? <>£900 Paid <span className="muted xs">{dt(p.phase2PaidAt)}</span></> : stageDone(p, 2) ? <strong style={{ color: "var(--amber)" }}>Due</strong> : "Unpaid"}</dd>
          {[3, 4].map((n) => (
            <StageRow key={n} n={n} p={p} paid={!!p.phase2PaidAt} />
          ))}
          <dt>Programme</dt><dd>{p.completedAt ? `Complete ${dt(p.completedAt)}` : p.phase1PaidAt ? "In progress" : "Not started"}</dd>
        </dl>

        <dl className="prog-grid">
          <dt>Google Drive</dt>
          <dd>{!manage ? <span className="muted">Restricted</span> : p.driveUrl ? <a href={p.driveUrl} target="_blank" rel="noopener noreferrer">Open Workspace ↗</a> : "Not set"}</dd>
          <dt>Assigned to</dt>
          <dd>
            {admin.role === "SUPER_ADMIN" ? (
              <form action={assignAdmin} className="action-row">
                <Hidden leadId={lead.id} />
                <select className="input" name="assignedAdminId" defaultValue={p.assignedAdminId ?? ""} style={{ minHeight: 32, padding: "2px 8px", fontSize: 13, width: "auto" }}>
                  <option value="">Super admins only</option>
                  {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm">Save</button>
              </form>
            ) : (assigned ?? "Super admins")}
          </dd>
          <dt>Revenue</dt>
          <dd>
            <div>Eligibility Review: {formatGBP(rev.review)}</div>
            <div>Phase 1: {formatGBP(rev.phase1)}</div>
            <div>Phase 2: {formatGBP(rev.phase2)}</div>
            {rev.writer > 0 && <div>Hire a Writer: {formatGBP(rev.writer)}</div>}
            {rev.other > 0 && <div>Other services: {formatGBP(rev.other)}</div>}
            <div style={{ marginTop: 4 }}><strong>Total client revenue: {formatGBP(rev.total)}</strong></div>
            <div className="xs muted">Attributed to {lead.utmSource ?? "direct"}{lead.utmCampaign ? ` / ${lead.utmCampaign}` : ""}{lead.ref ? ` · ref ${lead.ref}` : ""}</div>
          </dd>
        </dl>
      </div>

      {p.writerPaidAt && !stageDone(p, 2) && (
        <p className="callout small" style={{ marginTop: 14, padding: "10px 14px" }}>
          <strong>Writer services purchased.</strong> Bring the writer to Session 2 (Evidence &amp; Write-up Strategy) so the write-up can start straight away.
        </p>
      )}

      {manage ? (
        <>
          <div className="action-row" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            {!p.acceptedAt && (
              <>
                <form action={resendInvitation}><Hidden leadId={lead.id} /><ConfirmSubmit className="btn btn-dark btn-sm" message={`Send a new invitation to ${p.inviteEmail}? The previous link will stop working.`}>Resend Invitation</ConfirmSubmit></form>
                {inviteLive && <CopyLink url={inviteUrl(p.inviteToken!)} />}
                {status === "INVITED" && <form action={markInvitationDeclined}><Hidden leadId={lead.id} /><ConfirmSubmit className="btn btn-ghost btn-sm" message="Mark this invitation as declined?">Mark declined</ConfirmSubmit></form>}
              </>
            )}
            {open(1) && <StageButton action={completeStageAction} leadId={lead.id} n={1} label="Mark Stage 1 Complete" msg="Mark Stage 1 (Career Mapping) complete? This unlocks Stage 2 and emails the client." />}
            {p.phase1PaidAt && stage(2).status === "LOCKED" && <StageButton action={unlockStageAction} leadId={lead.id} n={2} label="Unlock Stage 2" ghost msg="Unlock Stage 2 without completing Stage 1? The client will be emailed." />}
            {open(2) && <StageButton action={completeStageAction} leadId={lead.id} n={2} label="Mark Stage 2 Complete" msg="Mark Stage 2 complete? This completes Phase 1 and asks the client for the £900 Phase 2 payment." />}
            {stageDone(p, 2) && !p.phase2PaidAt && (
              <form action={sendPhase2ReminderAction}><Hidden leadId={lead.id} /><ConfirmSubmit className="btn btn-secondary btn-sm" message="Email the client a Phase 2 payment reminder?">Send Phase 2 Payment Reminder</ConfirmSubmit></form>
            )}
            {open(3) && <StageButton action={completeStageAction} leadId={lead.id} n={3} label="Mark Stage 3 Complete" msg="Mark Stage 3 (Evidence Review) complete? This unlocks Stage 4 and emails the client." />}
            {p.phase2PaidAt && stage(4).status === "LOCKED" && <StageButton action={unlockStageAction} leadId={lead.id} n={4} label="Unlock Stage 4" ghost msg="Unlock Stage 4 without completing Stage 3? The client will be emailed." />}
            {open(4) && (
              <form action={completeProgrammeAction}><Hidden leadId={lead.id} /><ConfirmSubmit className="btn btn-primary btn-sm" message="Mark the programme complete? This completes Stage 4 and emails the client.">Mark Programme Complete</ConfirmSubmit></form>
            )}
            {admin.role === "SUPER_ADMIN" && (account || p.acceptedAt) && (
              <form action={viewAsClient}><Hidden leadId={lead.id} /><button className="btn btn-ghost btn-sm">View Client Portal</button></form>
            )}
          </div>
          {stageDone(p, 2) && !p.phase2PaidAt && (
            <p className="xs muted" style={{ margin: "8px 0 0" }}>Stage 3 opens automatically when the £900 payment is confirmed.</p>
          )}

          <details style={{ marginTop: 12 }} open={!!p.phase1PaidAt && !p.driveUrl}>
            <summary className="small">{p.driveUrl ? "Edit" : "Add"} Google Drive Workspace URL</summary>
            <form action={setDriveUrl} className="filters" style={{ marginTop: 8 }}>
              <Hidden leadId={lead.id} />
              <label style={{ flex: 1, minWidth: 260 }}>
                Folder link
                <input className="input" name="driveUrl" type="url" defaultValue={p.driveUrl ?? ""} placeholder="https://drive.google.com/drive/folders/…" style={{ width: "100%" }} />
              </label>
              <button className="btn btn-dark">Save</button>
            </form>
            <p className="xs muted" style={{ margin: "6px 0 0" }}>
              One folder per client — “Global Talent Lab — {lead.name}” with 01 Career &amp; Profile · 02 Evidence · 03 Recommendation Letters · 04 Personal Statement · 05 Strategy &amp; Feedback · 06 Final Application. Share it only with {p.inviteEmail}. The client sees it once Phase 1 is paid.
            </p>
          </details>
        </>
      ) : (
        <p className="small muted" style={{ marginTop: 12 }}>This client is assigned to {assigned ?? "another admin"}; you can view but not manage their programme.</p>
      )}
    </div>
  );
}

function StageRow({ n, p, paid }: { n: number; p: ProgrammeWithStages; paid: boolean }) {
  const s = p.stages.find((x) => x.number === n)!;
  return (
    <>
      <dt>Stage {n}</dt>
      <dd>
        {stageStatusLabel(n, s.status, paid)} <span className="muted xs">· {STAGES[n - 1].title}</span>
        {s.status === "COMPLETED" && <div className="xs muted">{dt(s.completedAt)} by {s.completedByName ?? "—"}</div>}
        {s.bookingStart && s.status !== "COMPLETED" && <div className="xs muted">Session {dt(s.bookingStart)} UTC{s.meetingUrl && <> · <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer">video link</a></>}</div>}
      </dd>
    </>
  );
}

function StageButton({ action, leadId, n, label, msg, ghost }: { action: (f: FormData) => Promise<void>; leadId: string; n: number; label: string; msg: string; ghost?: boolean }) {
  return (
    <form action={action}>
      <Hidden leadId={leadId} stage={n} />
      <ConfirmSubmit className={`btn ${ghost ? "btn-ghost" : "btn-dark"} btn-sm`} message={msg}>{label}</ConfirmSubmit>
    </form>
  );
}
