import { db } from "@/lib/db";
import { requirePortalViewer } from "@/lib/client-auth";
import { ChangePasswordForm } from "@/components/portal/forms";
import { logout } from "../../actions";

export default async function Account() {
  const viewer = await requirePortalViewer();
  const account = viewer.accountId ? await db.clientAccount.findUnique({ where: { id: viewer.accountId } }) : null;
  return (
    <>
      <h1>Account</h1>
      <div className="card">
        <dl className="kv" style={{ gridTemplateColumns: "110px 1fr" }}>
          <dt>Name</dt><dd>{account?.name ?? "—"}</dd>
          <dt>Email</dt><dd>{account?.email ?? viewer.email}</dd>
        </dl>
        <p className="small muted" style={{ margin: "12px 0 0" }}>To change your name or email, message us and we&apos;ll update it for you.</p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Change password</h3>
        <ChangePasswordForm disabled={viewer.preview} />
      </div>
      {!viewer.preview && (
        <form action={logout} style={{ marginTop: 16 }}>
          <button className="btn btn-ghost">Sign out</button>
        </form>
      )}
    </>
  );
}
