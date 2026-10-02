import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { funnel, parseRange, pct, rate, gbp, perUnit } from "@/lib/metrics";
import { site } from "@/lib/site-config";
import { addSpend, deleteSpend } from "../../actions";
import LinkBuilder from "./LinkBuilder";

type SP = Record<string, string | undefined>;

export default async function Campaigns({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const range = parseRange(sp);
  const { rows } = await funnel(range, {}, true);
  const spend = await db.spend.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Campaigns &amp; influencers</h1>
          <p className="muted small" style={{ margin: 0 }}>Judge each creator on paying customers and revenue per qualified lead — not clicks.</p>
        </div>
        <form className="filters" method="get">
          <label>From<input className="input" type="date" name="from" defaultValue={range.fromStr} /></label>
          <label>To<input className="input" type="date" name="to" defaultValue={range.toStr} /></label>
          <button className="btn btn-dark">Apply</button>
        </form>
      </div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        {rows.slice(0, 6).map((r) => (
          <div className="card" key={`${r.source}|${r.campaign}`}>
            <h3 style={{ marginBottom: 2 }}>{r.source}</h3>
            <p className="xs muted" style={{ marginBottom: 8 }}>{r.campaign}</p>
            <div className="small" style={{ lineHeight: 1.8 }}>
              {r.visitors.toLocaleString()} visitors<br />
              {r.assessments} assessments ({pct(rate(r.assessments, r.visitors))})<br />
              {r.qualified} qualified<br />
              {r.reviews} reviews · {r.audits} audits · {r.full} full-service<br />
              <strong>{gbp(r.revenuePence)} revenue</strong> · {gbp(perUnit(r.revenuePence, r.qualified))} / qualified lead
              {r.spendPence > 0 && <><br />Spend {gbp(r.spendPence)} · ROAS {(r.revenuePence / r.spendPence).toFixed(2)}×</>}
            </div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Source</th><th>Campaign</th><th className="num">Visitors</th><th className="num">Assessments</th><th className="num">Visit→assess</th><th className="num">Qualified</th>
              <th className="num">Reviews</th><th className="num">Audits</th><th className="num">Full</th><th className="num">Revenue</th><th className="num">Rev/qualified</th>
              <th className="num">Spend</th><th className="num">Cost/qualified</th><th className="num">CAC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.source}|${r.campaign}`}>
                <td>{r.source}</td><td>{r.campaign}</td><td className="num">{r.visitors}</td><td className="num">{r.assessments}</td><td className="num">{pct(rate(r.assessments, r.visitors))}</td>
                <td className="num">{r.qualified}</td><td className="num">{r.reviews}</td><td className="num">{r.audits}</td><td className="num">{r.full}</td>
                <td className="num">{gbp(r.revenuePence)}</td><td className="num">{gbp(perUnit(r.revenuePence, r.qualified))}</td>
                <td className="num">{r.spendPence ? gbp(r.spendPence) : "—"}</td>
                <td className="num">{r.spendPence ? gbp(perUnit(r.spendPence, r.qualified)) : "—"}</td>
                <td className="num">{r.spendPence ? gbp(perUnit(r.spendPence, r.customers)) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={14} className="muted">No campaign data in this range yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid g2" style={{ marginTop: 24, alignItems: "start" }}>
        <div className="card">
          <h3>Campaign link builder</h3>
          <p className="small muted">Give every creator their own link. The source is stored against the lead and every later purchase.</p>
          <LinkBuilder base={site.url} />
        </div>
        <div className="card">
          <h3>Marketing spend</h3>
          <p className="small muted">Used for cost per qualified lead, CAC and ROAS. Source must match the utm_source exactly.</p>
          <form action={addSpend} className="filters">
            <label>utm_source<input className="input" name="utmSource" required /></label>
            <label>utm_campaign<input className="input" name="utmCampaign" placeholder="optional" /></label>
            <label>Amount (£)<input className="input" name="amount" type="number" step="0.01" min="0.01" required style={{ minWidth: 90 }} /></label>
            <label>From<input className="input" type="date" name="periodStart" /></label>
            <label>To<input className="input" type="date" name="periodEnd" /></label>
            <button className="btn btn-dark">Add</button>
          </form>
          <table className="t" style={{ marginTop: 12 }}>
            <tbody>
              {spend.map((s) => (
                <tr key={s.id}>
                  <td>{s.utmSource}</td><td>{s.utmCampaign ?? "—"}</td><td className="num">{gbp(s.amountPence)}</td>
                  <td className="muted">{s.periodStart?.toISOString().slice(0, 10) ?? ""}{s.periodEnd ? ` → ${s.periodEnd.toISOString().slice(0, 10)}` : ""}</td>
                  <td><form action={deleteSpend}><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost" style={{ minHeight: 26, padding: "2px 8px", fontSize: 12 }}>Remove</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
