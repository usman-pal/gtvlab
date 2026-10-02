import { requirePortalViewer } from "@/lib/client-auth";
import { loadPortal } from "@/lib/portal-data";

const FOLDERS = ["01 Career & Profile", "02 Evidence", "03 Recommendation Letters", "04 Personal Statement", "05 Strategy & Feedback", "06 Final Application"];

export default async function Workspace() {
  const { programme: p } = await loadPortal(await requirePortalViewer());
  const driveUrl = p?.phase1PaidAt ? p.driveUrl : null;
  return (
    <>
      <h1>Application Workspace</h1>
      <div className="card">
        {driveUrl ? (
          <>
            <p>Your application documents and working materials are stored in your private Google Drive workspace. Only you and Global Talent Lab have access.</p>
            <a className="btn btn-dark btn-lg" href={driveUrl} target="_blank" rel="noopener noreferrer">Open Application Workspace</a>
            <h3 style={{ marginTop: 24 }}>How it&apos;s organised</h3>
            <ul className="checks">{FOLDERS.map((f) => <li key={f}>{f}</li>)}</ul>
            <p className="small muted" style={{ margin: 0 }}>
              Deliverables from each stage (your Criteria &amp; Evidence Map, Write-up Plan, written feedback and readiness review) are added to <strong>05 Strategy &amp; Feedback</strong>.
            </p>
          </>
        ) : p?.phase1PaidAt ? (
          <p style={{ margin: 0 }}>We&apos;re setting up your private Google Drive workspace — it will appear here shortly.</p>
        ) : (
          <p style={{ margin: 0 }}>Your private Google Drive workspace is created once you start the programme.</p>
        )}
      </div>
    </>
  );
}
