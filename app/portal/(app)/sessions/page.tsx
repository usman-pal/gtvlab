import Link from "next/link";
import { requirePortalViewer } from "@/lib/client-auth";
import { loadPortal } from "@/lib/portal-data";
import { STAGES } from "@/lib/programme-content";
import LocalTime from "@/components/LocalTime";
import { fmtDate } from "@/components/portal/StageCard";

const STATUS: Record<string, [string, string]> = {
  COMPLETED: ["Completed", "done"],
  BOOKED: ["Booked", "booked"],
  AVAILABLE: ["Available", "current"],
  LOCKED: ["Locked", "locked"],
};

export default async function Sessions() {
  const { programme: p } = await loadPortal(await requirePortalViewer());
  if (!p) return <h1>Sessions</h1>;
  const now = new Date();
  return (
    <>
      <h1>Sessions</h1>
      <p className="muted">One 1:1 video session per stage. Each stage is signed off by Global Talent Lab before the next one opens.</p>
      <div className="table-wrap">
        <table className="t" style={{ fontSize: 14 }}>
          <thead><tr><th>Session</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            {STAGES.map((c) => {
              const s = p.stages.find((x) => x.number === c.n)!;
              const [label, cls] = STATUS[s.status] ?? STATUS.LOCKED;
              const upcoming = !!s.bookingStart && s.bookingStart > now;
              return (
                <tr key={c.n}>
                  <td><strong style={{ color: "var(--ink)" }}>{c.n}. {c.title}</strong></td>
                  <td><span className={`badge ${cls}`}>{label}</span></td>
                  <td style={{ whiteSpace: "normal" }}>
                    {s.status === "COMPLETED" ? fmtDate(s.completedAt) : s.bookingStart ? <LocalTime iso={s.bookingStart.toISOString()} fallbackTz={s.bookingTimezone ?? "Europe/London"} /> : "—"}
                  </td>
                  <td>
                    {s.status === "AVAILABLE" && <Link className="btn btn-primary btn-sm" href={`/portal/sessions/${c.n}`}>Book</Link>}
                    {s.status === "BOOKED" && (
                      <span className="action-row">
                        {upcoming && s.meetingUrl && <a className="btn btn-dark btn-sm" href={s.meetingUrl} target="_blank" rel="noopener noreferrer">Join</a>}
                        <Link className="btn btn-secondary btn-sm" href={`/portal/sessions/${c.n}`}>View</Link>
                      </span>
                    )}
                    {s.status === "COMPLETED" && <Link href={`/portal/sessions/${c.n}`}>View</Link>}
                    {s.status === "LOCKED" && <span className="muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
