import type { Metadata } from "next";
import { Header, Footer } from "@/components/SiteChrome";
import { site } from "@/lib/site-config";

export const metadata: Metadata = { title: "Terms" };

// NOTE: template wording — have it reviewed before launch (including cancellation / refund terms).
export default function Terms() {
  return (
    <>
      <Header />
      <main className="section">
        <div className="container narrow stack">
          <h1>Terms of service</h1>
          <h3>What we provide</h3>
          <p>{site.scopeNote}</p>
          <p>{site.affiliationNote}</p>
          <h3>The free profile check</h3>
          <p>
            The profile check is an automated, preliminary triage based only on your answers. It is not an eligibility determination, an endorsement prediction or advice
            about your immigration position.
          </p>
          <h3>Paid services</h3>
          <p>
            Paid services are coaching sessions about your profile, evidence and application preparation. You remain responsible for your application, its contents and
            its submission. Endorsement and visa decisions are made solely by the relevant endorsing body and the Home Office.
          </p>
          <h3>Rescheduling</h3>
          <p>You can reschedule a booked session using the link in your confirmation email. Please contact {site.contactEmail} about cancellations.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
