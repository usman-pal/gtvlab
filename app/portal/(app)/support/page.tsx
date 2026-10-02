import { requirePortalViewer } from "@/lib/client-auth";
import { site, whatsappBusinessUrl } from "@/lib/site-config";

export default async function Support() {
  await requirePortalViewer();
  const wa = whatsappBusinessUrl();
  return (
    <>
      <h1>Support</h1>
      <div className="card">
        <h2 style={{ fontSize: "1.3rem" }}>Need help between sessions?</h2>
        <p>Application Strategy clients have WhatsApp support during the programme.</p>
        {wa ? (
          <a className="btn btn-primary btn-lg" href={wa} target="_blank" rel="noopener noreferrer">Message Global Talent Lab on WhatsApp</a>
        ) : (
          <p className="small muted">WhatsApp support details will appear here shortly.</p>
        )}
        <p className="small muted" style={{ margin: "16px 0 0" }}>
          You can also email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. We usually reply within one working day.
        </p>
      </div>
    </>
  );
}
