import { db } from "@/lib/db";
import { requirePortalViewer } from "@/lib/client-auth";
import PortalNav from "@/components/portal/PortalNav";
import { exitPreview } from "../actions";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePortalViewer();
  const lead = viewer.preview ? await db.lead.findUnique({ where: { id: viewer.leadId }, select: { name: true } }) : null;
  return (
    <>
      {viewer.preview && (
        <div className="preview-banner" role="status">
          <div className="container">
            <span>
              <strong>Viewing as {lead?.name ?? "client"} — Admin Preview</strong> · read-only: payments, bookings and account changes are disabled.
            </span>
            <form action={exitPreview}>
              <input type="hidden" name="leadId" value={viewer.leadId} />
              <button className="btn">Exit preview</button>
            </form>
          </div>
        </div>
      )}
      <PortalNav />
      <main className="portal-main">
        <div className="container" style={{ maxWidth: 880 }}>{children}</div>
      </main>
    </>
  );
}
