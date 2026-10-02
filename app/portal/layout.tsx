import type { Metadata } from "next";
import { Header } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Client portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal">
      <Header minimal />
      {children}
    </div>
  );
}
