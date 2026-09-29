import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <div className="admin-bar">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
          <nav>
            <Link href="/admin">Dashboard</Link>
            <Link href="/admin/campaigns">Campaigns &amp; influencers</Link>
            <Link href="/admin/discounts">Discount codes</Link>
            <a href="/api/admin/export">Export CSV</a>
          </nav>
          <form action={logout}>
            <button className="btn btn-ghost" style={{ minHeight: 32, padding: "4px 12px", color: "#cbd5e1", borderColor: "#334155", fontSize: 13 }}>Sign out</button>
          </form>
        </div>
      </div>
      <div className="container" style={{ padding: "24px 16px 64px" }}>{children}</div>
    </div>
  );
}
