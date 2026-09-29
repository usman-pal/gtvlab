import Link from "next/link";
import Image from "next/image";
import { Header, Footer } from "@/components/SiteChrome";
import StickyCta from "@/components/StickyCta";
import { Icons } from "@/components/Icons";
import { site, products, formatGBP, testimonials } from "@/lib/site-config";
import { faqs } from "@/lib/faq";

const roles = [
  { icon: Icons.code, title: "Software Engineers" },
  { icon: Icons.brain, title: "AI / Machine Learning Professionals" },
  { icon: Icons.data, title: "Data Scientists / Data Engineers" },
  { icon: Icons.shield, title: "Cybersecurity Professionals" },
  { icon: Icons.lead, title: "Product / Engineering Leaders" },
  { icon: Icons.rocket, title: "CTOs / Technical Founders" },
  { icon: Icons.spark, title: "Other senior digital technology professionals" },
];

const steps = [
  { n: "01", t: "Check your profile", d: "Complete the free 3-minute assessment. No payment, no call." },
  { n: "02", t: "Get your preliminary result", d: "We'll show you straight away whether your profile appears worth reviewing further." },
  { n: "03", t: "Personal review", d: `Suitable candidates can book a ${formatGBP(products.review.pricePence)} Personal Eligibility Review and pick a time immediately.` },
  { n: "04", t: "Build your strategy", d: "If you decide to proceed, move into an Evidence Audit or more comprehensive application support." },
];

const examples = [
  {
    role: "Senior ML Engineer",
    years: "8 years' experience",
    strengths: ["Major product impact", "Leadership", "Strong technical career"],
    gaps: ["Limited recognition outside employer"],
    verdict: "Potentially worth detailed assessment",
    cls: "v-b",
  },
  {
    role: "Software Engineer",
    years: "2 years' experience",
    strengths: ["Good technical trajectory", "Hackathon / community activity"],
    gaps: ["Limited sustained impact", "Limited external recognition"],
    verdict: "May benefit from developing evidence before applying",
    cls: "v-c",
  },
  {
    role: "CTO / Founder",
    years: "10 years' experience",
    strengths: ["Technology leadership", "Measurable company growth", "Industry recognition"],
    gaps: [],
    verdict: "Strong candidate for detailed assessment",
    cls: "v-a",
  },
];

export default function Home() {
  const review = products.review;
  const audit = products.audit;
  const strategy = products.strategy;
  return (
    <>
      <Header />
      <main>
        {/* 1 — Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="pill" style={{ alignSelf: "flex-start" }}>For software, AI, data, cyber &amp; product professionals</span>
              <h1 style={{ marginTop: 16 }}>
                UK Global Talent Visa for <span className="hl">Tech Professionals</span>
              </h1>
              <p className="sub">Find out whether your career evidence could support a Global Talent application — before spending months preparing one.</p>
              <p className="lead">
                Global Talent Lab helps software engineers, AI &amp; data professionals, technology leaders and digital-tech founders assess their profile, identify evidence
                gaps and build a stronger application strategy.
              </p>
              <div className="btn-row" id="hero-cta" style={{ marginTop: 24 }}>
                <Link href="/assessment" className="btn btn-primary btn-lg">{site.primaryCta}</Link>
                <a href="#services" className="btn btn-secondary btn-lg">View Services &amp; Pricing</a>
              </div>
              <p className="cta-note">
                <strong style={{ color: "var(--ink)" }}>Free preliminary assessment</strong> • Takes ~3 minutes • No payment or call needed
              </p>
            </div>
            <aside className="trust-card" aria-label="About the founder">
              <Image src={site.founder.photo} alt={`${site.founder.name}, founder of Global Talent Lab`} width={72} height={72} priority />
              <div>
                <p style={{ margin: "0 0 8px", color: "var(--ink)", fontWeight: 650 }}>Built by someone who has been through it.</p>
                <p className="small" style={{ margin: 0 }}>
                  Our founder was personally endorsed through the UK Global Talent route for digital technology and works as a data scientist in the UK. We help you see
                  your profile the way an assessor might — honestly.
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* 2 — Who it's for */}
        <section className="section alt" id="who">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Who it&apos;s for</span>
              <h2>Is Global Talent Lab for you?</h2>
              <p className="lead">
                <strong>Global Talent Lab currently specialises in the UK Global Talent route for digital technology professionals.</strong>
              </p>
            </div>
            <div className="grid g4">
              {roles.map((r) => (
                <div className="card role-card" key={r.title}>
                  <span className="ic"><r.icon /></span>
                  <strong>{r.title}</strong>
                </div>
              ))}
            </div>
            <div className="grid g2" style={{ marginTop: 28 }}>
              <div className="card">
                <h3>A good fit if you…</h3>
                <ul className="checks">
                  <li>work in digital technology and have measurable impact (products, systems, teams, commercial outcomes)</li>
                  <li>have, or are building, recognition beyond your employer — talks, open source, publications, awards, judging, mentoring</li>
                  <li>want an honest, evidence-first assessment — not hype</li>
                </ul>
              </div>
              <div className="card">
                <h3>Probably not the right fit if you…</h3>
                <ul className="checks crosses">
                  <li>work outside digital technology (e.g. arts, academia, healthcare, business roles without a tech focus)</li>
                  <li>want someone to &ldquo;handle the visa&rdquo; or submit it for you</li>
                  <li>are looking for guaranteed endorsement</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 3 — How it works */}
        <section className="section" id="how">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2>Start free. Only pay if a review makes sense.</h2>
            </div>
            <div className="grid g4 steps">
              {steps.map((s) => (
                <div className="card step-card" key={s.n}>
                  <div className="bar" />
                  <span className="step-num">{s.n}</span>
                  <h3>{s.t}</h3>
                  <p className="small" style={{ margin: 0 }}>{s.d}</p>
                </div>
              ))}
            </div>
            <div className="center" style={{ marginTop: 32 }}>
              <Link href="/assessment" className="btn btn-primary btn-lg">{site.primaryCta}</Link>
              <p className="small muted" style={{ marginTop: 10 }}>Free 3-minute preliminary assessment to see whether your career profile may be suitable for the UK Global Talent route.</p>
            </div>
          </div>
        </section>

        {/* 4 — Founder */}
        <section className="section dark" id="founder">
          <div className="container founder-grid">
            <div className="founder-photo">
              <Image src={site.founder.photo} alt={`${site.founder.name}, founder of Global Talent Lab`} width={720} height={1080} sizes="(min-width: 900px) 420px, 90vw" />
            </div>
            <div>
              <span className="eyebrow">Why trust Global Talent Lab</span>
              <h2>I&apos;ve been on the applicant&apos;s side of this process.</h2>
              <p>
                I&apos;m {site.founder.name}. I went through the UK Global Talent process myself as a technology professional, so I know how hard it is to judge your own
                evidence — what feels impressive at work is not always what an assessor can verify.
              </p>
              <ul className="checks" style={{ margin: "18px 0" }}>
                {site.founder.facts.map((f) => <li key={f}>{f}</li>)}
                <li>Professional background in data, AI and technology</li>
              </ul>
              <p>
                Global Talent Lab focuses specifically on helping technology professionals understand, structure and present their evidence. It&apos;s evidence-first
                coaching, not agent-style &ldquo;we&apos;ll handle everything&rdquo;.
              </p>
              <p className="small" style={{ color: "#94a3b8" }}>
                My own endorsement doesn&apos;t mean anyone else will be endorsed — every case depends on the candidate&apos;s own evidence.
              </p>
              <details className="proof">
                <summary>See my endorsement confirmation (cropped)</summary>
                <Image src="/img/endorsement.webp" alt="Cropped screenshot of the founder's Global Talent endorsement email" width={900} height={870} sizes="(min-width: 900px) 600px, 90vw" />
              </details>
              <div className="btn-row" style={{ marginTop: 24 }}>
                <Link href="/assessment" className="btn btn-primary">{site.primaryCtaShort}</Link>
                <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ color: "#fff", borderColor: "#334155" }}>View LinkedIn</a>
              </div>
            </div>
          </div>
        </section>

        {/* 5 — Illustrative profiles */}
        <section className="section" id="profiles">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Recognise yourself?</span>
              <h2>What does a potential Global Talent profile look like?</h2>
              <p className="muted">Three illustrative examples — not real clients.</p>
            </div>
            <div className="grid g3">
              {examples.map((e) => (
                <article className="card profile-card" key={e.role}>
                  <span className="illustrative">Illustrative example</span>
                  <h3>{e.role}</h3>
                  <div className="meta">{e.years}</div>
                  <h4>Strengths</h4>
                  <ul>{e.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                  {e.gaps.length > 0 && (
                    <>
                      <h4>Potential {e.gaps.length > 1 ? "gaps" : "gap"}</h4>
                      <ul>{e.gaps.map((s) => <li key={s}>{s}</li>)}</ul>
                    </>
                  )}
                  <div className="verdict"><span className={e.cls}>{e.verdict}</span></div>
                </article>
              ))}
            </div>
            <p className="center small muted" style={{ marginTop: 20 }}>
              <strong>These examples are illustrative only and do not represent eligibility decisions or guarantees.</strong>
            </p>
          </div>
        </section>

        {/* 6 — Services */}
        <section className="section alt" id="services">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Services &amp; pricing</span>
              <h2>How we can help</h2>
              <p className="muted">Every journey starts with the free profile check, so you never pay for something that isn&apos;t right for you.</p>
            </div>
            <div className="grid g4">
              <div className="card price-card">
                <span className="tier">1 · FREE PROFILE CHECK</span>
                <div className="price">£0</div>
                <div className="dur">~3 minutes, online</div>
                <p className="small">Initial screening to determine whether your profile is worth investigating. You get a preliminary result immediately.</p>
                <Link href="/assessment" className="btn btn-primary">{site.primaryCtaShort}</Link>
              </div>
              <div className="card price-card featured">
                <span className="badge">START HERE</span>
                <span className="tier">2 · PERSONAL ELIGIBILITY REVIEW</span>
                <div className="price">{formatGBP(review.pricePence)}</div>
                <div className="dur">{review.duration}</div>
                <p className="small">{review.summary}</p>
                <ul>{review.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
                <div className="when">Available after the free check — pay and pick a time straight away.</div>
                <Link href="/assessment" className="btn btn-dark">Start With Free Assessment</Link>
              </div>
              <div className="card price-card">
                <span className="tier">3 · EVIDENCE AUDIT</span>
                <div className="price">{formatGBP(audit.pricePence)}</div>
                <div className="dur">{audit.duration}</div>
                <p className="small">{audit.summary}</p>
                <ul>{audit.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
                <div className="when">Usually recommended after your £49 review, if your profile is ready for it.</div>
                <Link href="/assessment" className="btn btn-secondary">Start With Free Assessment</Link>
              </div>
              <div className="card price-card">
                <span className="tier">4 · APPLICATION STRATEGY &amp; SUPPORT</span>
                <div className="price">{formatGBP(strategy.pricePence)}</div>
                <div className="dur">{strategy.duration}</div>
                <p className="small">{strategy.summary}</p>
                <ul>{strategy.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
                <div className="when">For candidates we both agree are ready. You write and submit your own application; no outcome is guaranteed.</div>
                <Link href="/assessment" className="btn btn-secondary">Start With Free Assessment</Link>
              </div>
            </div>
            <p className="center small muted" style={{ marginTop: 22 }}>
              Already preparing and just need answers on referees or your personal statement? A {products.qa.name} ({formatGBP(products.qa.pricePence)}) is also available —{" "}
              <a href={`mailto:${site.contactEmail}?subject=${encodeURIComponent("1-Hour Q&A enquiry")}`}>email us</a>.
            </p>
          </div>
        </section>

        {/* 7 — Don't apply yet */}
        <section className="section" id="honest">
          <div className="container narrow center">
            <span className="eyebrow">Our promise</span>
            <h2>Sometimes the right advice is not to apply yet</h2>
            <p className="lead">
              Not every technology professional should apply immediately. If your current evidence is unlikely to support a strong case, we would rather explain the gaps
              than encourage you to spend significant time and money on an application prematurely.
            </p>
            <div className="grid g3" style={{ textAlign: "left", margin: "28px 0" }}>
              <div className="card">
                <h3>Understated impact</h3>
                <p className="small" style={{ margin: 0 }}>Real outcomes stay buried in job descriptions instead of measurable impact and leadership evidence.</p>
              </div>
              <div className="card">
                <h3>Unstructured evidence</h3>
                <p className="small" style={{ margin: 0 }}>Strong work submitted as scattered links and screenshots, without a clear story or evaluation frame.</p>
              </div>
              <div className="card">
                <h3>Poor timing</h3>
                <p className="small" style={{ margin: 0 }}>Applying before the evidence is there — or waiting far longer than necessary when it already is.</p>
              </div>
            </div>
            <Link href="/assessment" className="btn btn-primary btn-lg">{site.primaryCtaShort}</Link>
          </div>
        </section>

        {/* 8 — Testimonials (only genuine ones; hidden until added in site-config) */}
        {testimonials.length > 0 && (
          <section className="section alt" id="testimonials">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow">Client feedback</span>
                <h2>What candidates say about the review</h2>
              </div>
              <div className="grid g3">
                {testimonials.map((t) => (
                  <figure className="card" key={t.name} style={{ margin: 0 }}>
                    <blockquote style={{ margin: 0, color: "var(--ink)" }}>&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="small muted" style={{ marginTop: 12 }}>— {t.name}, {t.role}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 9 — FAQ */}
        <section className={`section${testimonials.length ? "" : " alt"}`} id="faq">
          <div className="container narrow">
            <div className="section-head">
              <span className="eyebrow">FAQ</span>
              <h2>Questions before you start</h2>
            </div>
            <div className="faq">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <div className="ans">{f.a.map((p, i) => <p key={i}>{p}</p>)}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 10 — Final CTA */}
        <section className="section dark center" id="final-cta">
          <div className="container narrow">
            <h2>Find out where your profile stands — in about 3 minutes</h2>
            <p style={{ color: "#cbd5e1" }}>Free preliminary assessment. Instant result. No obligation to book anything.</p>
            <Link href="/assessment" className="btn btn-primary btn-lg" style={{ marginTop: 10 }}>{site.primaryCta}</Link>
          </div>
        </section>
      </main>
      <Footer />
      <StickyCta />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.join(" ") } })),
          }),
        }}
      />
    </>
  );
}
