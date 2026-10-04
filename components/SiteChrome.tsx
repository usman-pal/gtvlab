import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site-config";

export function Header({ minimal = false, home = false }: { minimal?: boolean; home?: boolean }) {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="Global Talent Lab home">
          <Image src="/img/logo.png" alt="" width={34} height={34} priority />
          <span>
            Global Talent Lab
            <small>UK Global Talent · Digital Technology</small>
          </span>
        </Link>
        {!minimal && (
          <nav className="nav" aria-label="Main">
            <a href="/#why">Why Global Talent</a>
            <a href="/#who">Who It&apos;s For</a>
            <a href="/#path">Find Your Path</a>
            <a href="/#how">How We Help</a>
            <a href="/#faq">FAQ</a>
          </nav>
        )}
        {!minimal && home && (
          <div className="header-actions">
            <Link href={site.primaryCtaHref} className="header-link">{site.primaryCtaShort}</Link>
            <a href="#path" className="btn btn-primary">Find My Path</a>
          </div>
        )}
        {!minimal && !home && (
          <Link href={site.primaryCtaHref} className="btn btn-primary">
            <span className="header-cta-full">{site.primaryCta}</span>
            <span className="header-cta-short">{site.primaryCtaShort}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>Global Talent Lab</h4>
            <p>Profile assessment, evidence review and application-preparation coaching for digital technology professionals considering the UK Global Talent route.</p>
            <p className="xs">{site.scopeNote}</p>
            <p className="xs">{site.affiliationNote}</p>
          </div>
          <div>
            <h4>Get started</h4>
            <p><Link href="/assessment">Free profile check</Link></p>
            <p><a href="/audit">Application Audit</a></p>
            <p><a href="/#how">Services &amp; pricing</a></p>
            <p><a href="/#faq">FAQ</a></p>
          </div>
          <div>
            <h4>Contact</h4>
            <p><a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></p>
            <p><a href={site.linkedin} target="_blank" rel="noopener noreferrer">Founder on LinkedIn</a></p>
            <p><Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms</Link></p>
          </div>
        </div>
        <p className="xs" style={{ marginTop: 28 }}>© {new Date().getFullYear()} Global Talent Lab. All rights reserved.</p>
      </div>
    </footer>
  );
}
