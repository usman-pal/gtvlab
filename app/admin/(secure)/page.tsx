import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { funnel, parseRange, rate, pct, gbp, perUnit, DIRECT } from "@/lib/metrics";
import { PROFESSIONS, EXPERIENCE, labelFor } from "@/lib/assessment-options";
import { LEAD_STATUSES, statusLabel } from "@/lib/site-config";

type SP = Record<string, string | undefined>;

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { total: t, rows } = await funnel(range, { source: sp.source || undefined, campaign: sp.campaign || undefined });

  const where: Prisma.LeadWhereInput = {
    createdAt: { gte: range.from, lte: range.to },
    ...(sp.grade ? { grade: sp.grade } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.profession ? { profession: sp.profession } : {}),
    ...(sp.country ? { country: { contains: sp.country } } : {}),
    ...(sp.source ? (sp.source === DIRECT ? { utmSource: null } : { utmSource: sp.source }) : {}),
    ...(sp.campaign ? { utmCampaign: sp.campaign } : {}),
    ...(sp.origin ? { origin: sp.origin } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }] } : {}),
  };
  const page = Math.max(1, Number(sp.page) || 1);
  const [leads, count, sources, campaigns, paidNotBooked, waPending, bookedUnpaid, paymentHelp] = await Promise.all([
    db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, skip: (page - 1) * 100 }),
    db.lead.count({ where }),
    db.lead.findMany({ distinct: ["utmSource"], select: { utmSource: true }, where: { utmSource: { not: null } } }),
    db.lead.findMany({ distinct: ["utmCampaign"], select: { utmCampaign: true }, where: { utmCampaign: { not: null } } }),
    db.lead.count({ where: { reviewPaidAt: { not: null }, reviewBookedAt: null } }),
    db.message.count({ where: { channel: "whatsapp", status: "manual" } }),
    db.lead.count({ where: { reviewBookedAt: { not: null }, reviewPaidAt: null } }),
    db.event.findMany({ where: { name: "payment_help_requested", createdAt: { gte: new Date(Date.now() - 14 * 864e5) } }, select: { leadId: true }, distinct: ["leadId"] }),
  ]);
  const helpLeadIds = paymentHelp.map((e) => e.leadId).filter((x): x is string => !!x);
  const paymentHelpOpen = helpLeadIds.length ? await db.lead.findMany({ where: { id: { in: helpLeadIds }, revenuePence: 0 }, select: { id: true, name: true } }) : [];

  const kpis: [string, string][] = [
    ["Visitors", String(t.visitors)],
    ["Assessment starts", String(t.starts)],
    ["Completions", String(t.assessments)],
    ["A leads", String(t.a)],
    ["B leads", String(t.b)],
    ["C leads", String(t.c)],
    ["Paid reviews", String(t.reviews)],
    ["Evidence audits", String(t.audits)],
    ["Full-service", String(t.full)],
    ["Revenue", gbp(t.revenuePence)],
  ];
  const rates: [string, string, string][] = [
    ["Visitor → assessment", pct(rate(t.assessments, t.visitors)), "Traffic quality"],
    ["Assessment → qualified (A/B)", pct(rate(t.qualified, t.assessments)), "Qualification quality"],
    ["Qualified → £49", pct(rate(t.reviews, t.qualified)), "Sales effectiveness"],
    ["£49 → £369", pct(rate(t.audits, t.reviews)), "Product effectiveness"],
    ["£369 → £1,899", pct(rate(t.full, t.audits)), "High-ticket effectiveness"],
    ["Visitor → customer", pct(rate(t.customers, t.visitors)), ""],
    ["Revenue / visitor", gbp(perUnit(t.revenuePence, t.visitors)), "Marketing economics"],
    ["Revenue / qualified lead", gbp(perUnit(t.revenuePence, t.qualified)), "Primary metric"],
    ["Cost / qualified lead", t.spendPence ? gbp(perUnit(t.spendPence, t.qualified)) : "—", "Enter spend in Campaigns"],
    ["CAC", t.spendPence ? gbp(perUnit(t.spendPence, t.customers)) : "—", "Spend ÷ paying customers"],
  ];
  const qs = (over: SP) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][]);
    return `?${p}`;
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Funnel dashboard</h1>
          <p className="muted small" style={{ margin: 0 }}>
            Cohort view: visitors in range, and leads created in range with everything they bought since. {sp.source && <>Source: <strong>{sp.source}</strong>. </>}
          </p>
        </div>
        <form className="filters" method="get">
          <label>From<input className="input" type="date" name="from" defaultValue={range.fromStr} /></label>
          <label>To<input className="input" type="date" name="to" defaultValue={range.toStr} /></label>
          <label>
            Source
            <select className="input" name="source" defaultValue={sp.source ?? ""}>
              <option value="">All</option>
              <option value={DIRECT}>{DIRECT}</option>
              {sources.map((s) => <option key={s.utmSource} value={s.utmSource!}>{s.utmSource}</option>)}
            </select>
          </label>
          <label>
            Campaign
            <select className="input" name="campaign" defaultValue={sp.campaign ?? ""}>
              <option value="">All</option>
              {campaigns.map((s) => <option key={s.utmCampaign} value={s.utmCampaign!}>{s.utmCampaign}</option>)}
            </select>
          </label>
          <button className="btn btn-dark">Apply</button>
        </form>
      </div>

      {(paidNotBooked > 0 || waPending > 0 || bookedUnpaid > 0 || paymentHelpOpen.length > 0) && (
        <div className="callout warn small" style={{ marginBottom: 16 }}>
          <strong>Needs attention:</strong> {paidNotBooked > 0 && <><Link href={`/admin?status=REVIEW_PAID&from=2000-01-01`}>{paidNotBooked} paid but not booked</Link> · </>}
          {waPending > 0 && <>{waPending} WhatsApp message(s) to send manually (open the lead) · </>}
          {bookedUnpaid > 0 && <>{bookedUnpaid} booking(s) without payment · </>}
          {paymentHelpOpen.length > 0 && (
            <>
              Payment help requested (unpaid):{" "}
              {paymentHelpOpen.map((l, i) => <span key={l.id}>{i > 0 && ", "}<Link href={`/admin/leads/${l.id}`}>{l.name}</Link></span>)}
            </>
          )}
        </div>
      )}

      <div className="kpis">
        {kpis.map(([k, v]) => (
          <div className="kpi" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
        ))}
      </div>
      <div className="kpis" style={{ marginTop: 10 }}>
        {rates.map(([k, v, h]) => (
          <div className="kpi" key={k}><div className="k">{k}</div><div className="v">{v}</div><div className="xs muted">{h}</div></div>
        ))}
      </div>

      <h2 style={{ fontSize: "1.1rem", margin: "28px 0 10px" }}>Revenue by traffic source</h2>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Source</th><th className="num">Visitors</th><th className="num">Starts</th><th className="num">Assessments</th><th className="num">A/B</th><th className="num">C</th>
              <th className="num">£49</th><th className="num">£369</th><th className="num">£1,899</th><th className="num">Revenue</th><th className="num">Rev / visitor</th><th className="num">Rev / qualified</th><th className="num">Cost / qualified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source}>
                <td><Link href={qs({ source: r.source, page: undefined })}>{r.source}</Link></td>
                <td className="num">{r.visitors}</td><td className="num">{r.starts}</td><td className="num">{r.assessments}</td><td className="num">{r.qualified}</td><td className="num">{r.c}</td>
                <td className="num">{r.reviews}</td><td className="num">{r.audits}</td><td className="num">{r.full}</td><td className="num">{gbp(r.revenuePence)}</td>
                <td className="num">{gbp(perUnit(r.revenuePence, r.visitors))}</td><td className="num">{gbp(perUnit(r.revenuePence, r.qualified))}</td>
                <td className="num">{r.spendPence ? gbp(perUnit(r.spendPence, r.qualified)) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={13} className="muted">No data in this range yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: "1.1rem", margin: "28px 0 10px" }}>Leads ({count})</h2>
      <form className="filters" method="get" style={{ marginBottom: 10 }}>
        <input type="hidden" name="from" value={range.fromStr} />
        <input type="hidden" name="to" value={range.toStr} />
        {sp.source && <input type="hidden" name="source" value={sp.source} />}
        {sp.campaign && <input type="hidden" name="campaign" value={sp.campaign} />}
        <label>Search<input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="name or email" /></label>
        <label>Grade
          <select className="input" name="grade" defaultValue={sp.grade ?? ""}><option value="">All</option><option>A</option><option>B</option><option>C</option></select>
        </label>
        <label>Status
          <select className="input" name="status" defaultValue={sp.status ?? ""}><option value="">All</option>{LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        </label>
        <label>Profession
          <select className="input" name="profession" defaultValue={sp.profession ?? ""}><option value="">All</option>{PROFESSIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        </label>
        <label>Country<input className="input" name="country" defaultValue={sp.country ?? ""} /></label>
        <label>Origin
          <select className="input" name="origin" defaultValue={sp.origin ?? ""}><option value="">All</option><option value="website">Website</option><option value="legacy_google_form">Legacy Google Form</option></select>
        </label>
        <button className="btn btn-dark">Filter</button>
        <Link className="btn btn-ghost" href={`/admin?from=${range.fromStr}&to=${range.toStr}`}>Reset</Link>
      </form>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr><th>Name</th><th>Country</th><th>Profession</th><th>Experience</th><th className="num">Score</th><th>Grade</th><th>Source</th><th>Campaign</th><th>Status</th><th className="num">Revenue</th><th>Created</th></tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/admin/leads/${l.id}`}>{l.name}</Link>{l.origin === "legacy_google_form" && <span className="tag" style={{ marginLeft: 6 }}>legacy</span>}</td>
                <td>{l.country ?? "—"}</td>
                <td>{labelFor(PROFESSIONS, l.profession)}</td>
                <td>{labelFor(EXPERIENCE, l.experience)}</td>
                <td className="num">{l.score}</td>
                <td className={`g-${l.grade}`}>{l.grade}</td>
                <td>{l.utmSource ?? "—"}</td>
                <td>{l.utmCampaign ?? "—"}</td>
                <td>{statusLabel(l.status)}</td>
                <td className="num">{l.revenuePence ? gbp(l.revenuePence) : ""}</td>
                <td>{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={11} className="muted">No leads match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {count > 100 && (
        <div className="btn-row" style={{ marginTop: 12 }}>
          {page > 1 && <Link className="btn btn-ghost" href={qs({ page: String(page - 1) })}>← Previous</Link>}
          {page * 100 < count && <Link className="btn btn-ghost" href={qs({ page: String(page + 1) })}>Next →</Link>}
        </div>
      )}
    </>
  );
}
