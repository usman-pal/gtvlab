import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatGBP } from "@/lib/site-config";
import { deriveStatus, programmeStatusLabel, currentStage, paidPence, stageDone, PROGRAMME_TOTAL_PENCE } from "@/lib/programme-content";

const FILTERS = [
  ["", "All"],
  ["invited", "Invited"],
  ["not_accepted", "Invitation not accepted"],
  ["p1_unpaid", "Phase 1 unpaid"],
  ["stage1", "Stage 1"],
  ["stage2", "Stage 2"],
  ["p2_due", "Phase 2 payment due"],
  ["stage3", "Stage 3"],
  ["stage4", "Stage 4"],
  ["completed", "Completed"],
] as const;

const short = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export default async function StrategyClients({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const admin = await requireAdmin();
  const rows = await db.strategyProgramme.findMany({
    where: admin.role === "SUPER_ADMIN" ? {} : { assignedAdminId: admin.id },
    include: { stages: true, lead: { select: { id: true, name: true, email: true, revenuePence: true, utmSource: true, utmCampaign: true, ref: true, account: { select: { id: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const now = new Date();

  const view = rows.map((p) => {
    const status = deriveStatus(p, now);
    const cur = currentStage(p);
    const next = p.stages.filter((s) => s.bookingStart && s.bookingStart > now && s.status === "BOOKED").sort((a, b) => a.bookingStart!.getTime() - b.bookingStart!.getTime())[0];
    return { p, status, cur, next };
  });

  const match = (v: (typeof view)[number], f: string) => {
    const { p, status, cur } = v;
    switch (f) {
      case "invited": return status === "INVITED";
      case "not_accepted": return !p.acceptedAt;
      case "p1_unpaid": return !!p.acceptedAt && !p.phase1PaidAt && status !== "DECLINED";
      case "stage1": case "stage2": case "stage3": case "stage4": return !p.completedAt && cur === Number(f.slice(-1));
      case "p2_due": return stageDone(p, 2) && !p.phase2PaidAt;
      case "completed": return status === "COMPLETED";
      default: return true;
    }
  };
  const f = sp.f ?? "";
  const shown = view.filter((v) => match(v, f));
  const totalRevenue = shown.reduce((t, v) => t + v.p.lead.revenuePence, 0);

  return (
    <>
      <h1 style={{ fontSize: "1.5rem" }}>Application Strategy Clients</h1>
      <p className="muted small" style={{ marginTop: -4 }}>
        {admin.role === "SUPER_ADMIN" ? "Everyone invited to or enrolled in the programme." : "Clients assigned to you."} Open a client for their full record, controls and portal preview.
      </p>
      <div className="action-row" style={{ margin: "12px 0 16px" }}>
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k ? `/admin/strategy?f=${k}` : "/admin/strategy"} className={`btn btn-sm ${f === k ? "btn-dark" : "btn-ghost"}`}>
            {label} <span className="muted" style={{ marginLeft: 4 }}>{view.filter((v) => match(v, k)).length}</span>
          </Link>
        ))}
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr><th>Client</th><th>Invitation</th><th>Account</th><th className="num">Payment</th><th>Current stage</th><th>Next session</th><th>Drive</th><th className="num">Revenue</th></tr>
          </thead>
          <tbody>
            {shown.map(({ p, status, cur, next }) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/leads/${p.lead.id}`}>{p.lead.name}</Link>
                  {p.writerPaidAt && <span className="tag" style={{ marginLeft: 6 }}>+ Writer</span>}
                  <div className="xs muted">{[p.lead.utmSource ?? "direct", p.lead.utmCampaign, p.lead.ref && `ref ${p.lead.ref}`].filter(Boolean).join(" / ")}</div>
                </td>
                <td>{p.acceptedAt ? "Accepted ✓" : programmeStatusLabel(status)}</td>
                <td>{p.lead.account ? "✓" : "—"}</td>
                <td className="num">{formatGBP(paidPence(p))} / {formatGBP(PROGRAMME_TOTAL_PENCE)}</td>
                <td>{p.completedAt ? "Completed ✓" : status === "PHASE_1_COMPLETE" ? "Phase 2 payment due" : cur ? `Stage ${cur}` : "—"}</td>
                <td>{next?.bookingStart ? short(next.bookingStart) : "—"}</td>
                <td>{p.driveUrl ? <a href={p.driveUrl} target="_blank" rel="noopener noreferrer">Open Drive</a> : "—"}</td>
                <td className="num">{formatGBP(p.lead.revenuePence)}<div className="xs muted">incl. review</div></td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={8} className="muted">No clients match.</td></tr>}
          </tbody>
          {shown.length > 0 && (
            <tfoot><tr><td colSpan={7} className="muted">{shown.length} client{shown.length === 1 ? "" : "s"}</td><td className="num"><strong>{formatGBP(totalRevenue)}</strong></td></tr></tfoot>
          )}
        </table>
      </div>
    </>
  );
}
