import type { Metadata } from "next";
import { Header, Footer } from "@/components/SiteChrome";
import { products, site } from "@/lib/site-config";
import AuditForm from "./AuditForm";

export const metadata: Metadata = {
  title: "Get your Global Talent application reviewed",
  description: "An expert review of your prepared UK Global Talent application — evidence, recommendation letters and personal statement — before you submit.",
};

const REVIEW = [
  ["Criteria alignment", "Whether each piece of evidence clearly supports the criteria you're claiming — and whether two optional criteria are convincingly met."],
  ["Evidence strength", "Keep / strengthen / replace / remove for every document, with the reason."],
  ["Individual contribution & impact", "Whether your own role and measurable results come through, rather than your team's or employer's."],
  ["Recommendation letters", "Whether your referees are well chosen and their letters are specific, credible and consistent with your evidence."],
  ["Personal statement", "Structure, narrative and how well it ties your evidence together."],
  ["Gaps & risks", "Missing evidence, duplication and anything likely to raise questions — with practical ways to fix them."],
];

export default function AuditIntro() {
  const audit = products.audit;
  return (
    <>
      <Header />
      <main>
        <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="container narrow">
            <span className="eyebrow">Application Audit</span>
            <h1 style={{ fontSize: "clamp(1.9rem,4.8vw,2.7rem)" }}>Get your application reviewed before you submit</h1>
            <p className="lead">
              For candidates who&apos;ve already prepared their Global Talent application and want an expert to check it first. No eligibility questionnaire — just a few questions
              about where your application stands.
            </p>

            <div className="card" style={{ marginTop: 24 }}>
              <h3>What we review</h3>
              <div className="grid g2" style={{ marginTop: 10 }}>
                {REVIEW.map(([t, d]) => (
                  <div key={t}>
                    <strong style={{ color: "var(--ink)" }}>{t}</strong>
                    <p className="small muted" style={{ margin: "2px 0 0" }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h3>How it works</h3>
              <ol style={{ paddingLeft: 20, margin: "8px 0 0" }}>
                <li>Answer 7 short questions about your application (about 2 minutes).</li>
                <li>See the service and price, then pay and book your {audit.duration.toLowerCase()} straight away.</li>
                <li>Share your evidence, letters and personal statement at least 3 working days before the call, so we can review them in advance.</li>
                <li>On the call, we go through every finding and agree what to change before you submit.</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="section alt" id="questions" style={{ paddingTop: 40 }}>
          <div className="container narrow">
            <div className="section-head" style={{ marginBottom: 24 }}>
              <span className="eyebrow">Step 1 of 2</span>
              <h2 style={{ fontSize: "clamp(1.4rem,3.4vw,1.9rem)" }}>About your application</h2>
            </div>
            <AuditForm />
            <p className="xs muted" style={{ marginTop: 16 }}>{site.scopeNote}</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
