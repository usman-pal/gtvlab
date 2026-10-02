import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const sup = admin.role === "SUPER_ADMIN";
  return (
    <div className="admin">
      <div className="admin-bar">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, minHeight: 52, padding: "8px 16px" }}>
          <nav>
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/strategy">Strategy clients</Link>
            {sup && (
              <>
                <Link href="/admin/campaigns">Campaigns &amp; influencers</Link>
                <Link href="/admin/discounts">Discount codes</Link>
                <Link href="/admin/team">Team</Link>
                <a href="/api/admin/export">Export CSV</a>
              </>
            )}
          </nav>
          <form action={logout} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="xs" style={{ color: "#94a3b8" }}>{admin.name} · {sup ? "Super admin" : "Admin"}</span>
            <button className="btn btn-ghost" style={{ minHeight: 32, padding: "4px 12px", color: "#cbd5e1", borderColor: "#334155", fontSize: 13 }}>Sign out</button>
          </form>
        </div>
      </div>
      <div className="container" style={{ padding: "24px 16px 64px" }}>{children}</div>
    </div>
  );
}
