import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PROFESSIONS, EXPERIENCE, SENIORITY, EVIDENCE, HELP_WANTED, labelFor } from "@/lib/assessment-options";
import { LEAD_STATUSES, statusLabel, products, formatGBP, site } from "@/lib/site-config";
import { safeJson, waMeLink } from "@/lib/messaging";
import { changeStatus, addNote, recordManualPayment, markMessageSent } from "../../../actions";
import { requireAdmin } from "@/lib/auth";
import { LIFECYCLE_LABELS } from "@/lib/lifecycle";
import { deriveStatus, programmeStatusLabel } from "@/lib/programme-content";
import StrategyPanel, { inviteProps } from "@/components/admin/StrategyPanel";
import InviteModal from "@/components/admin/InviteModal";

const dt = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace("T", " ") : "—");
const hours = (a: Date | null, b: Date | null) => (a && b ? `${Math.round(((b.getTime() - a.getTime()) / 36e5) * 10) / 10}h` : "");

export default async function LeadDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const admin = await requireAdmin();
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { sendAt: "asc" } },
      programme: { include: { stages: { orderBy: { number: "asc" } } } },
      account: true,
      lifecycle: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!lead) notFound();
  const admins = await db.adminUser.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const strategyStatus = lead.programme ? deriveStatus(lead.programme) : "NOT_INVITED";
  const evidence = safeJson<string[]>(lead.evidence, []);
  const strengths = safeJson<string[]>(lead.strengths, []);
  const notes = safeJson<string[]>(lead.scoreNotes, []);
  const legacy = safeJson<Record<string, string> | null>(lead.legacyData, null);
  const lastTouch = safeJson<Record<string, string> | null>(lead.lastTouch, null);
  const resultLink = `${site.url}/assessment/result/${lead.token}`;

  const timeline: [string, Date | null][] = [
    ["Assessment submitted", lead.createdAt],
    ["Result viewed", lead.resultViewedAt],
    ["Paid CTA clicked", lead.paidClickedAt],
    ["Checkout started", lead.checkoutStartedAt],
    ["Eligibility Review paid", lead.reviewPaidAt],
    ["Review booked", lead.reviewBookedAt],
    ["Review completed", lead.reviewCompletedAt],
    ["Audit purchased", lead.auditPurchasedAt],
    ["Full service purchased", lead.fullServicePurchasedAt],
    ["Contacted", lead.contactedAt],
    ["Guidance opt-in", lead.nurtureOptInAt],
    ["Lost / not suitable", lead.lostAt],
  ];
  // Typed programme events (STRATEGY_INVITATION_SENT, PHASE_1_PAID …) merged into the same chronology.
  const has = (t: string) => lead.lifecycle.some((e) => e.type === t);
  const covered = (k: string) => (k === "Review completed" && has("ELIGIBILITY_REVIEW_COMPLETED")) || (k === "Full service purchased" && has("PHASE_1_PAID"));
  const lifecycleRows = [
    ...timeline.filter(([k, d]) => d && !covered(k)).map(([k, d]) => ({ key: k, label: k, at: d!, meta: "" })),
    ...lead.lifecycle.map((e) => {
      const m = safeJson<Record<string, unknown>>(e.meta, {});
      const bits = [e.actorName ?? (e.actor !== "system" ? e.actor : ""), typeof m.amount === "number" ? formatGBP(m.amount * 100) : "", typeof m.start === "string" ? `for ${m.start.slice(0, 16).replace("T", " ")}` : "", m.resend ? "re-sent" : ""];
      return { key: e.id, label: LIFECYCLE_LABELS[e.type] ?? e.type, at: e.createdAt, meta: bits.filter(Boolean).join(" · ") };
    }),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <>
      <p className="small"><Link href="/admin">← All leads</Link></p>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>
            {lead.name} <span className={`g-${lead.grade}`}>· {lead.grade}</span> <span className="muted" style={{ fontSize: "1rem", fontWeight: 600 }}>score {lead.score} ({lead.scoringVersion})</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            <a href={`mailto:${lead.email}`}>{lead.email}</a> · {lead.whatsapp ?? "no WhatsApp"} · {lead.country ?? "—"} {lead.linkedin && <>· <a href={lead.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
          </p>
          <p className="small" style={{ margin: "6px 0 0" }}>
            Status: <strong>{statusLabel(lead.status)}</strong> · Revenue: <strong>{formatGBP(lead.revenuePence)}</strong> · {lead.unsubscribed ? <span className="tag">unsubscribed</span> : null}
            {lead.consentWhatsapp ? <span className="tag">WhatsApp consent</span> : null}
            {" "}· Application Strategy: <a href="#strategy"><strong>{programmeStatusLabel(strategyStatus)}</strong></a>
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        {!lead.programme && <InviteModal {...inviteProps(lead)} />}
        <form action={changeStatus} className="filters">
          <input type="hidden" name="id" value={lead.id} />
          <label>Change status
            <select className="input" name="status" defaultValue={lead.status}>{LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </label>
          <button className="btn btn-dark">Update</button>
        </form>
        </div>
      </div>
      {sp.msg && <div className="callout small" style={{ marginTop: 14, padding: "10px 14px" }}>{sp.msg}</div>}
      {sp.err && <div className="callout warn small" style={{ marginTop: 14, padding: "10px 14px" }}>{sp.err}</div>}

      <div className="grid g2" style={{ marginTop: 20, alignItems: "start" }}>
        <div className="card">
          <h3>Questionnaire</h3>
          <dl className="kv">
            <dt>Profession</dt><dd>{labelFor(PROFESSIONS, lead.profession)}{lead.professionOther ? ` — ${lead.professionOther}` : ""}</dd>
            <dt>Experience</dt><dd>{labelFor(EXPERIENCE, lead.experience)}</dd>
            <dt>Seniority</dt><dd>{labelFor(SENIORITY, lead.seniority)}</dd>
            <dt>Evidence</dt><dd>{evidence.length ? evidence.map((e) => <span className="tag" key={e}>{labelFor(EVIDENCE, e)}</span>) : "—"}{lead.evidenceOther && <div className="small">Other: {lead.evidenceOther}</div>}</dd>
            <dt>Strongest achievement</dt><dd style={{ whiteSpace: "pre-wrap" }}>{lead.achievement || "—"}</dd>
            <dt>Wants help with</dt><dd>{labelFor(HELP_WANTED, lead.helpWanted)}</dd>
            <dt>Strengths shown</dt><dd>{strengths.join(", ") || "—"}</dd>
            <dt>Scoring notes</dt><dd className="small">{notes.join(" · ")}</dd>
          </dl>
          {legacy && (
            <details style={{ marginTop: 12 }}>
              <summary className="small">Original Google Form response</summary>
              <dl className="kv small" style={{ marginTop: 8 }}>{Object.entries(legacy).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
            </details>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h3>Attribution</h3>
            <dl className="kv">
              <dt>Source / medium</dt><dd>{lead.utmSource ?? "—"} / {lead.utmMedium ?? "—"}</dd>
              <dt>Campaign</dt><dd>{lead.utmCampaign ?? "—"}</dd>
              <dt>Content / term</dt><dd>{lead.utmContent ?? "—"} / {lead.utmTerm ?? "—"}</dd>
              <dt>ref</dt><dd>{lead.ref ?? "—"}</dd>
              <dt>Referrer</dt><dd>{lead.referrer ?? "—"}</dd>
              <dt>Landing page</dt><dd>{lead.landingPath ?? "—"}</dd>
              <dt>First seen</dt><dd>{dt(lead.firstSeenAt)}</dd>
              {lastTouch && <><dt>Latest touch</dt><dd className="small">{[lastTouch.utmSource, lastTouch.utmMedium, lastTouch.utmCampaign].filter(Boolean).join(" / ")} ({lastTouch.at?.slice(0, 10)})</dd></>}
              <dt>Origin</dt><dd>{lead.origin}</dd>
            </dl>
          </div>

          <div className="card">
            <h3>Lifecycle</h3>
            <table className="t">
              <tbody>
                {lifecycleRows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}{r.meta && <div className="xs muted">{r.meta}</div>}</td>
                    <td>{dt(r.at)}</td>
                    <td className="num muted">{r.key !== "Assessment submitted" ? hours(lead.createdAt, r.at) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lead.bookingStart && (
              <p className="small" style={{ marginTop: 10 }}>
                Booking: <strong>{dt(lead.bookingStart)} UTC</strong> ({lead.bookingTimezone ?? "?"}) {lead.meetingUrl && <>· <a href={lead.meetingUrl} target="_blank" rel="noopener noreferrer">video link</a></>}
              </p>
            )}
            <p className="small" style={{ marginTop: 10 }}>
              Candidate&apos;s result page (their booking/payment link): <a href={resultLink} target="_blank" rel="noopener noreferrer">{resultLink}</a>
              <br />
              <span className="muted">Mark the lead &ldquo;Review completed&rdquo; and that page will offer the {formatGBP(products.audit.pricePence)} and {formatGBP(products.strategy.pricePence)} services with checkout — purchases stay attributed to this lead&apos;s source.</span>
            </p>
          </div>
        </div>
      </div>

      <StrategyPanel lead={lead} programme={lead.programme} account={lead.account} payments={lead.payments} admin={admin} admins={admins} />

      <div className="grid g2" style={{ marginTop: 16, alignItems: "start" }}>
        <div className="card">
          <h3>Internal notes</h3>
          <p className="xs muted" style={{ marginTop: -2 }}>Private — visible only to admins, never in the client portal.</p>
          <form action={addNote}>
            <input type="hidden" name="id" value={lead.id} />
            <textarea className="input" name="body" style={{ minHeight: 90 }} placeholder="Add a note…" />
            <button className="btn btn-dark" style={{ marginTop: 8 }}>Save note</button>
          </form>
          {lead.notes.map((n) => (
            <div key={n.id} style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 10 }}>
              <div className="xs muted">{dt(n.createdAt)}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <h3>Payments</h3>
            <table className="t">
              <thead><tr><th>Product</th><th className="num">Amount</th><th>Status</th><th>Via</th><th>Date</th></tr></thead>
              <tbody>
                {lead.payments.map((p) => (
                  <tr key={p.id}><td>{products[p.product as keyof typeof products]?.name ?? p.product}</td><td className="num">{formatGBP(p.amountPence)}{p.discountCode && <span className="tag" style={{ marginLeft: 6 }}>{p.discountCode} −{p.discountPercent}%</span>}</td><td>{p.status}</td><td>{p.provider}</td><td>{dt(p.paidAt ?? p.createdAt)}</td></tr>
                ))}
                {lead.payments.length === 0 && <tr><td colSpan={5} className="muted">None</td></tr>}
              </tbody>
            </table>
            <details style={{ marginTop: 10 }}>
              <summary className="small">Record a payment taken outside Stripe</summary>
              <form action={recordManualPayment} className="filters" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={lead.id} />
                <label>Product<select className="input" name="product">{Object.values(products).map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></label>
                <label>Amount (£)<input className="input" name="amount" type="number" step="0.01" min="1" required style={{ minWidth: 90 }} /></label>
                <label>Note<input className="input" name="note" /></label>
                <button className="btn btn-dark">Record</button>
              </form>
            </details>
          </div>

          <div className="card">
            <h3>Messages</h3>
            <table className="t">
              <thead><tr><th>When</th><th>Channel</th><th>Template</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {lead.messages.map((m) => (
                  <tr key={m.id}>
                    <td>{dt(m.sentAt ?? m.sendAt)}</td><td>{m.channel}</td><td>{m.template}</td>
                    <td title={m.error ?? ""}>{m.status}</td>
                    <td>
                      {m.channel === "whatsapp" && m.status === "manual" && lead.whatsapp && (
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          <a className="btn btn-primary" style={{ minHeight: 28, padding: "2px 10px", fontSize: 12 }} href={waMeLink(lead, m.template)} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
                          <form action={markMessageSent}><input type="hidden" name="id" value={m.id} /><button className="btn btn-ghost" style={{ minHeight: 28, padding: "2px 10px", fontSize: 12 }}>Mark sent</button></form>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {lead.messages.length === 0 && <tr><td colSpan={5} className="muted">None</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Status history</h3>
            <table className="t">
              <tbody>
                {lead.history.map((h) => <tr key={h.id}><td>{dt(h.createdAt)}</td><td>{h.from ? statusLabel(h.from) : "—"} → {statusLabel(h.to)}</td><td className="muted">{h.actor}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
