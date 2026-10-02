import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminUser, toggleAdminUser } from "../../team-actions";

const dt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace("T", " ") : "—");

export default async function Team({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <h1 style={{ fontSize: "1.5rem" }}>Team</h1>
      <p className="muted small" style={{ marginTop: -4 }}>
        <strong>Super admins</strong> see every applicant and client, revenue, campaigns, Drive links and can preview client portals. <strong>Admins</strong> can work leads and
        manage the Application Strategy clients assigned to them. The owner login (ADMIN_PASSWORD) is always a super admin.
      </p>
      {sp.msg && <div className="callout small" style={{ margin: "12px 0", padding: "10px 14px" }}>{sp.msg}</div>}
      {sp.err && <div className="callout warn small" style={{ margin: "12px 0", padding: "10px 14px" }}>{sp.err}</div>}
      <div className="card" style={{ margin: "16px 0" }}>
        <h3>Add an admin</h3>
        <form action={createAdminUser} className="filters">
          <label>Name<input className="input" name="name" required maxLength={80} /></label>
          <label>Email<input className="input" name="email" type="email" required /></label>
          <label>Temporary password<input className="input" name="password" type="text" minLength={10} required autoComplete="off" /></label>
          <label>Role<select className="input" name="role"><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super admin</option></select></label>
          <button className="btn btn-dark">Add</button>
        </form>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}</td><td>{dt(u.lastLoginAt)}</td><td>{u.active ? "Active" : "Disabled"}</td>
                <td><form action={toggleAdminUser}><input type="hidden" name="id" value={u.id} /><button className="btn btn-ghost btn-sm">{u.active ? "Disable" : "Enable"}</button></form></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="muted">No named admins yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
