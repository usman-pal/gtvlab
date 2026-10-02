"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/portal", "Dashboard"],
  ["/portal/workspace", "Application Workspace"],
  ["/portal/sessions", "Sessions"],
  ["/portal/payments", "Payments"],
  ["/portal/support", "Support"],
  ["/portal/account", "Account"],
] as const;

export default function PortalNav() {
  const path = usePathname();
  return (
    <nav className="portal-nav" aria-label="Portal">
      <div className="container">
        {LINKS.map(([href, label]) => {
          const active = href === "/portal" ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
