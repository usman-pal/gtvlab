import Link from "next/link";
import { findInvitation } from "@/lib/programme";
import { formatGBP, site } from "@/lib/site-config";
import { STAGES, PROGRAMME_NAME, PHASE_1_PENCE, PHASE_2_PENCE, PROGRAMME_TOTAL_PENCE } from "@/lib/programme-content";
import { first } from "@/lib/email-templates";
import { CreateAccountForm } from "@/components/portal/forms";
import { decline } from "../../actions";

export default async function Invitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInvitation(token);

  if (!invite) {
    return (
      <main className="container">
        <div className="portal-auth">
          <div className="card">
            <h1 style={{ fontSize: "1.5rem" }}>This invitation link isn&apos;t valid</h1>
            <p>It may have expired, already been used, or been replaced by a newer invitation.</p>
            <p className="small">
              Already created your account? <Link href="/portal/login">Sign in</Link>. Otherwise email{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we&apos;ll send a new link.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const lead = invite.lead;
  return (
    <main className="container" style={{ maxWidth: 880, padding: "32px 16px 72px" }}>
      <span className="eyebrow">Your invitation</span>
      <h1 style={{ fontSize: "clamp(1.7rem,4.5vw,2.4rem)" }}>{first(lead.name)}, you&apos;re invited to the {PROGRAMME_NAME}</h1>
      <p className="lead">Following your Eligibility Review, we&apos;d like to work with you on developing your Global Talent application.</p>
      {invite.inviteNote && (
        <blockquote className="callout neutral" style={{ margin: "16px 0", whiteSpace: "pre-wrap" }}>
          {invite.inviteNote}
          <div className="small muted" style={{ marginTop: 8 }}>— {invite.invitedByName ?? site.founder.name}</div>
        </blockquote>
      )}

      <div className="grid g2" style={{ marginTop: 20, alignItems: "start" }}>
        <div className="card">
          <h3>Four structured stages</h3>
          <ol style={{ paddingLeft: 20, margin: "8px 0 0" }}>
            {STAGES.map((s) => (
              <li key={s.n} style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--ink)" }}>{s.title}</strong>
                <div className="small muted">{s.lockedSummary}</div>
                <div className="small">Deliverable: {s.deliverable}</div>
              </li>
            ))}
          </ol>
          <div className="pay-row" style={{ borderTop: "1px solid var(--line)", marginTop: 8 }}>
            <span>Programme total</span><span className="amt">{formatGBP(PROGRAMME_TOTAL_PENCE)}</span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{formatGBP(PHASE_1_PENCE)} to begin Stages 1–2 · {formatGBP(PHASE_2_PENCE)} before beginning Stages 3–4. Nothing is charged until you choose to start.</p>
        </div>

        <div className="card">
          {lead.account ? (
            <>
              <h3>You already have an account</h3>
              <p className="small">Sign in to view your programme.</p>
              <Link className="btn btn-dark btn-block" href="/portal/login">Sign in</Link>
            </>
          ) : (
            <>
              <h3>Create your private workspace</h3>
              <p className="small muted">You&apos;ll use this to view the programme, pay, book sessions and open your documents.</p>
              <CreateAccountForm token={token} name={lead.name} email={invite.inviteEmail} />
              <form action={decline} style={{ marginTop: 14, textAlign: "center" }}>
                <input type="hidden" name="token" value={token} />
                <button className="btn btn-ghost btn-sm">Not for me right now</button>
              </form>
            </>
          )}
        </div>
      </div>
      <p className="xs muted" style={{ marginTop: 24 }}>{site.scopeNote}</p>
    </main>
  );
}
