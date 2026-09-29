import type { Metadata } from "next";
import { Header, Footer } from "@/components/SiteChrome";
import { site } from "@/lib/site-config";

export const metadata: Metadata = { title: "Privacy policy" };

// NOTE: template wording — have it reviewed for UK GDPR / PECR before launch.
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="section">
        <div className="container narrow stack">
          <h1>Privacy policy</h1>
          <p className="muted">Last updated: {new Date().getFullYear()}</p>
          <h3>Who we are</h3>
          <p>Global Talent Lab ({site.domain}) provides profile assessment, evidence review and application-preparation coaching. Contact: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</p>
          <h3>What we collect</h3>
          <p>
            When you complete the profile check we collect your answers (profession, experience, seniority, types of evidence, your description of an achievement and what
            help you want), your name, email, WhatsApp number, country, optional LinkedIn URL, and how you found us (campaign / referral parameters and referring page).
            If you buy a service, our payment provider Stripe processes your card details — we never see them. If you book a call, our scheduling provider Cal.com
            processes your booking.
          </p>
          <h3>Why we use it</h3>
          <ul>
            <li>To give you your preliminary result and deliver any service you buy (contract).</li>
            <li>To contact you about your assessment and relevant services, where you agreed to this (consent). You can unsubscribe at any time.</li>
            <li>To understand which marketing channels bring suitable candidates, so we can spend sensibly (legitimate interests). This uses aggregated funnel data.</li>
          </ul>
          <h3>Cookies and similar technologies</h3>
          <p>
            We store your assessment progress and campaign source in your browser so you can resume the check and so we know which link brought you. Analytics (Google
            Analytics) and advertising (e.g. Meta, Google Ads) tags load only if you accept them in the cookie banner, and they only receive generic funnel events (for
            example &ldquo;assessment started&rdquo;) — never your answers, name or contact details.
          </p>
          <h3>Sharing</h3>
          <p>We use processors to run the service: hosting, database, Stripe (payments), Cal.com (scheduling), our email provider and, if you opt in, WhatsApp. We don&apos;t sell your data.</p>
          <h3>Retention</h3>
          <p>We keep assessment data for up to 24 months after your last interaction, and payment records for as long as required for tax purposes.</p>
          <h3>Your rights</h3>
          <p>You can ask to access, correct or delete your data, or object to its use, by emailing {site.contactEmail}. You can also complain to the ICO (ico.org.uk).</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
