import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header, Footer } from "@/components/SiteChrome";
import PayButton from "@/components/PayButton";
import PurchaseTracker from "@/components/PurchaseTracker";
import { products, formatGBP, site, testimonials } from "@/lib/site-config";
import { safeJson } from "@/lib/messaging";

export const metadata: Metadata = { title: "Your preliminary result", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ResultPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const sp = await searchParams;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const lead = await db.lead.findUnique({ where: { token } });
  if (!lead) notFound();
  if (!lead.resultViewedAt) await db.lead.update({ where: { id: lead.id }, data: { resultViewedAt: new Date() } });

  const strengths = safeJson<string[]>(lead.strengths, []);
  const first = lead.name.split(/\s+/)[0];
  const review = products.review;
  const price = formatGBP(review.pricePence);
  const isAB = lead.grade === "A" || lead.grade === "B";
  const outOfScope = lead.profession === "other";
  const cancelled = sp.checkout === "cancelled";

  const Offer = ({ cta, positioning }: { cta: string; positioning?: string }) => (
    <section className="card offer" id="review" style={{ marginTop: 28 }}>
      <span className="eyebrow">Recommended next step</span>
      <h2 style={{ fontSize: "1.5rem" }}>Personal Eligibility Review — {price}</h2>
      <p className="muted" style={{ marginTop: -4 }}>{review.duration} · pay securely, then choose your time straight away</p>
      {positioning && <p>{positioning}</p>}
      <p style={{ marginBottom: 6, color: "var(--ink)", fontWeight: 650 }}>During a 30-minute review we will:</p>
      <ul className="checks" style={{ marginBottom: 20 }}>
        <li>examine your career profile</li>
        <li>identify potentially relevant criteria</li>
        <li>discuss your strongest evidence</li>
        <li>identify obvious gaps</li>
        <li>explain what your sensible next step should be</li>
      </ul>
      {lead.reviewPaidAt ? (
        <div className="callout">
          <strong>You&apos;ve already paid for your review.</strong>{" "}
          {lead.reviewBookedAt ? "Your appointment is booked — check your email for details." : <Link href={`/book/${lead.token}`}>Choose your appointment time →</Link>}
        </div>
      ) : (
        <>
          {cancelled && <p className="callout neutral small">Checkout was cancelled — no payment was taken. You can try again whenever you&apos;re ready. If your card or country wasn&apos;t accepted, use <strong>Having trouble paying?</strong> below and we&apos;ll sort out another way to pay.</p>}
          <PayButton token={lead.token} product="review" label={cta} codeError={sp.code_product === "review" ? sp.code_error : undefined} />
          <p className="xs muted center" style={{ marginTop: 10 }}>
            Secure card payment via Stripe · Choose an appointment immediately after paying · No waiting for a reply
          </p>
          <p className="xs muted center" style={{ marginTop: 4 }}>
            The review is coaching on your profile and evidence — not immigration advice, and not a guarantee of endorsement.
          </p>
        </>
      )}
      {testimonials.length > 0 && (
        <blockquote className="small" style={{ margin: "20px 0 0", borderLeft: "3px solid var(--teal)", paddingLeft: 12 }}>
          &ldquo;{testimonials[0].quote}&rdquo; <span className="muted">— {testimonials[0].name}</span>
        </blockquote>
      )}
    </section>
  );

  return (
    <>
      <Header minimal />
      <main className="section" style={{ paddingTop: 32 }}>
        <div className="container narrow">
          {sp.purchased && products[sp.purchased as keyof typeof products] && (
            <div className="callout" style={{ marginBottom: 20 }}>
              <PurchaseTracker event={sp.purchased === "strategy" ? "full_service_purchased" : "audit_purchased"} value={products[sp.purchased as keyof typeof products].pricePence / 100} onceKey={`${sp.purchased}_${lead.id}`} />
              <strong>Thank you — payment for {products[sp.purchased as keyof typeof products].name} received.</strong> We&apos;ll email you within one working day to schedule your sessions.
            </div>
          )}
          <p className="muted small" style={{ marginBottom: 6 }}>Preliminary result for {first}</p>

          {lead.grade === "A" && (
            <>
              <span className="grade-chip v-a">Worth reviewing in detail</span>
              <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.5rem)" }}>Your profile appears worth reviewing in detail</h1>
              <p className="lead">Based on your answers, your profile contains several indicators that may be relevant to a UK Global Talent application.</p>
            </>
          )}
          {lead.grade === "B" && (
            <>
              <span className="grade-chip v-b">Potential — needs closer examination</span>
              <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.5rem)" }}>Your profile shows potential, but there are areas we need to examine</h1>
              <p className="lead">
                You have some characteristics that can be relevant to a Global Talent application, but parts of your evidence — such as external recognition, depth of
                impact or career stage — need a closer look before anyone could say whether a strong case is realistic.
              </p>
            </>
          )}
          {lead.grade === "C" && (
            <>
              <span className="grade-chip v-c">Not the right next step yet</span>
              <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.5rem)" }}>A paid assessment may not be the right next step yet</h1>
              <p className="lead">
                {outOfScope
                  ? "Thank you for completing the check. Based on what you told us, your profession doesn't currently appear closely aligned with the digital-technology profiles Global Talent Lab specialises in, so we don't think paying us for a review would be the best use of your money."
                  : "Thank you for completing the check. Based on the information supplied, your evidence may need further development before a paid review would be good value for you."}
              </p>
            </>
          )}

          {isAB && strengths.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: "1rem" }}>Indicators in your answers</h3>
              <ul className="checks" style={{ margin: 0 }}>{strengths.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}

          {isAB && (
            <div className="callout warn" style={{ marginTop: 20 }}>
              <strong>The questionnaire cannot determine whether you qualify.</strong> The quality, independence and relevance of your actual evidence needs to be reviewed.
            </div>
          )}

          {lead.grade === "A" && <Offer cta={`Book My ${price} Review`} />}
          {lead.grade === "B" && (
            <Offer
              cta={`Review My Profile — ${price}`}
              positioning="The purpose of the review is to determine whether you have a realistic application path now, whether specific evidence gaps can be addressed, or whether applying later would make more sense."
            />
          )}

          {lead.grade === "C" && (
            <>
              <div className="card" style={{ marginTop: 24 }}>
                <h3>What usually makes a profile easier to assess</h3>
                <p>
                  Profiles generally become easier to assess when there is stronger evidence of measurable professional impact, leadership, innovation or recognition beyond
                  normal job responsibilities.
                </p>
                <ul className="checks">
                  <li>Outcomes you personally drove, with numbers — users, revenue, cost, performance, adoption</li>
                  <li>Leadership of significant technical work, not only participation in it</li>
                  <li>Recognition from outside your employer — talks, publications, open-source adoption, awards, judging, media</li>
                  <li>Evidence others can verify: letters, links and documents from people who saw your impact</li>
                </ul>
                {outOfScope && (
                  <p className="small muted">
                    The Global Talent route also covers other fields (for example research, arts and culture) through different endorsing bodies. Those are outside our
                    specialism, so please look for specialist support in your field.
                  </p>
                )}
              </div>
              <section className="card" style={{ marginTop: 20 }} id="guidance">
                {lead.nurtureOptInAt || sp.guidance === "1" ? (
                  <div className="callout">
                    <strong>Done — guidance is on its way to {lead.email}.</strong> You can unsubscribe at any time.
                  </div>
                ) : (
                  <>
                    <h3>Get free Global Talent guidance</h3>
                    <p className="small">A few short, practical emails on how evidence is assessed and how to strengthen it. No sales pressure.</p>
                    <form action="/api/guidance" method="post">
                      <input type="hidden" name="token" value={lead.token} />
                      <button className="btn btn-primary btn-block" type="submit">Send Me Global Talent Guidance</button>
                    </form>
                  </>
                )}
              </section>
              {!outOfScope && (
                <p className="small muted" style={{ marginTop: 18 }}>
                  If you think your answers didn&apos;t capture your profile, you can <Link href="/assessment">retake the check</Link> or email{" "}
                  <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
                </p>
              )}
            </>
          )}

          {lead.reviewCompletedAt && (
            <section className="card" style={{ marginTop: 28 }} id="services">
              <span className="eyebrow">After your review</span>
              <h3>Continue with deeper support</h3>
              <div className="grid g2" style={{ marginTop: 12 }}>
                {(["audit", "strategy"] as const).map((k) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ color: "var(--ink)" }}>{products[k].name} — {formatGBP(products[k].pricePence)}</strong>
                    <p className="small">{products[k].summary}</p>
                    <div style={{ marginTop: "auto" }}>
                      <PayButton token={lead.token} product={k} label={`Purchase ${products[k].name} — ${formatGBP(products[k].pricePence)}`} className="btn btn-secondary btn-block" codeError={sp.code_product === k ? sp.code_error : undefined} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="xs muted" style={{ marginTop: 32 }}>
            This result is Global Talent Lab&apos;s preliminary triage based only on your answers. It is not an eligibility determination, an endorsement prediction or
            immigration advice. {site.affiliationNote}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
