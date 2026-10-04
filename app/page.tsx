import Link from "next/link";
import Image from "next/image";
import { Fraunces } from "next/font/google";
import { Header, Footer } from "@/components/SiteChrome";
import StickyCta from "@/components/StickyCta";
import { site, products, formatGBP, testimonials } from "@/lib/site-config";
import { faqs } from "@/lib/faq";
import "./home.css";

// Display serif for the homepage only — functional UI stays in Inter.
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"] });

const benefits = [
  { t: "No sponsor", d: "No job offer is required to apply. Your visa is not tied to one employer." },
  { t: "Work on your terms", d: "Work as an employee, be self-employed or be a company director — and change jobs without notifying the Home Office." },
  { t: "Settlement from 3 years", d: "Exceptional Talent applicants may qualify for settlement after 3 years. Exceptional Promise normally requires 5 years." },
  { t: "Bring your family", d: "Eligible partners and children can apply as your dependants." },
];

// Typical sponsored work route vs Global Talent — kept deliberately general.
const compare = [
  { k: "Job offer needed to apply", s: "Yes", g: "No" },
  { k: "Status tied to one employer", s: "Yes", g: "No" },
  { k: "Minimum salary threshold", s: "Yes", g: "No" },
  { k: "Self-employment or founding a company", s: "Restricted", g: "Allowed" },
];

const roles = [
  "Software Engineers",
  "AI & Machine Learning",
  "Data Scientists & Data Engineers",
  "Cybersecurity Professionals",
  "Product & Engineering Leaders",
  "CTOs & Technical Founders",
  "Commercial / Business Leaders in Digital Technology",
];

const trustPoints = [
  "Endorsed through the Digital Technology route",
  "Went through the application process personally",
  "UK technology / data professional",
  "Evidence-first application coaching",
];

export default function Home() {
  const review = products.review;
  const audit = products.audit;
  const strategy = products.strategy;
  const reviewPrice = formatGBP(review.pricePence);

  const paths = [
    {
      key: "a",
      label: "Path A",
      headline: "I’m not sure whether I’m ready.",
      statement: "I have relevant technology experience and achievements, but I don’t know whether they’re strong enough for Global Talent.",
      next: "Start with a free profile check",
      explain: `In about 3 minutes, we’ll get a preliminary view of whether your profile is worth exploring further. Promising profiles can then book a ${reviewPrice} Personal Eligibility Review.`,
      meta: ["Free", "About 3 minutes, online"],
      route: ["Free profile check", `${reviewPrice} review`],
      detailsTitle: "What happens next",
      details: [
        "Answer a short set of questions about your career and evidence",
        "See an instant preliminary result — no payment or call needed",
        `If your profile looks promising, book a ${review.duration.toLowerCase()} Personal Eligibility Review`,
      ],
      cta: { href: "/assessment", label: "Check My Profile — Free" },
      note: null as string | null,
    },
    {
      key: "b",
      label: "Path B",
      headline: "I think I’m ready. Help me build the case.",
      statement: "I want to apply, but I need expert help deciding which criteria to target, which evidence to use and how to structure the application.",
      next: strategy.name,
      explain:
        "For suitable candidates, we work alongside you through criteria strategy, evidence selection, application narrative, recommendation-letter strategy and final readiness.",
      meta: [formatGBP(strategy.pricePence), "4 × 60-minute 1:1 sessions"],
      route: ["Free profile check", `${reviewPrice} review`, "Strategy & Support"],
      detailsTitle: "What’s included",
      details: strategy.deliverables,
      cta: { href: "/assessment", label: "Start With My Profile" },
      note: "Application Strategy is offered after we establish that your profile is a suitable fit.",
    },
    {
      key: "c",
      label: "Path C",
      headline: "My application is already drafted.",
      statement: "I’ve already prepared my evidence, recommendation letters and personal statement. I want an expert to stress-test them before I submit.",
      next: audit.name,
      explain: "We review your evidence against the criteria you’re claiming and give specific Keep / Strengthen / Replace / Remove feedback before submission.",
      meta: [formatGBP(audit.pricePence), audit.duration],
      route: null,
      detailsTitle: "What’s included",
      details: audit.deliverables,
      cta: { href: "/audit", label: "Get My Application Reviewed" },
      note: "Already built the application? You can go straight to the audit.",
    },
  ];

  return (
    <div className={`home ${serif.variable}`}>
      <Header home />
      <main>
        {/* 1 — Hero: the value of the visa first */}
        <section className="h-hero" aria-labelledby="hero-title">
          <div className="container h-hero-grid">
            <div className="h-hero-copy">
              <h1 id="hero-title">
                <span className="h-kicker">UK Global Talent Visa · Digital Technology</span>
                <span className="h-hero-line">No sponsor. No job offer.</span>{" "}
                <span className="h-hero-line">
                  Build your UK career <em>on your terms.</em>
                </span>
              </h1>
              <p className="h-hero-lead">
                For exceptional and emerging technology professionals, the UK Global Talent Visa offers a route to live and work in the UK without tying your
                immigration status to one employer.
              </p>
              <p className="h-hero-sub">
                Global Talent Lab helps you understand whether your profile is ready, build a stronger application strategy, or review an application you&apos;ve
                already prepared.
              </p>
              <div className="btn-row" id="hero-cta">
                <a href="#path" className="btn btn-primary btn-lg">Find My Best Path</a>
                <Link href="/assessment" className="btn btn-secondary btn-lg">Check My Profile — Free</Link>
              </div>
              <p className="h-reassure">
                <span>Digital technology specialists</span>
                <span>Independent application coaching</span>
                <span>No endorsement outcome is guaranteed</span>
              </p>
            </div>

            <aside className="h-compare" aria-labelledby="compare-title">
              <h2 id="compare-title" className="h-compare-title">How it differs from a sponsored work visa</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Feature</span></th>
                    <th scope="col">Typical sponsored route</th>
                    <th scope="col">Global Talent</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map((r) => (
                    <tr key={r.k}>
                      <th scope="row">{r.k}</th>
                      <td>{r.s}</td>
                      <td className="gt">{r.g}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="h-compare-note">
                General overview only. Global Talent Lab is not an immigration law firm and does not give immigration advice.
              </p>
            </aside>
          </div>
        </section>

        {/* 2 — Why Global Talent */}
        <section className="h-section h-why" id="why" aria-labelledby="why-title">
          <div className="container">
            <div className="h-head">
              <span className="h-eyebrow"><span className="h-num">01</span> Why Global Talent</span>
              <h2 id="why-title">Why Global Talent?</h2>
              <p>Career flexibility that a sponsored work visa cannot offer.</p>
            </div>
            <ul className="h-benefits">
              {benefits.map((b, i) => (
                <li key={b.t}>
                  <span className="h-benefit-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{b.t}</h3>
                  <p>{b.d}</p>
                </li>
              ))}
            </ul>
            <ul className="h-also" aria-label="Also worth knowing">
              <li>No minimum salary requirement</li>
              <li>No English-language eligibility requirement</li>
            </ul>
          </div>
        </section>

        {/* 3 — Who it's for */}
        <section className="h-section h-who" id="who" aria-labelledby="who-title">
          <div className="container">
            <div className="h-head">
              <span className="h-eyebrow"><span className="h-num">02</span> Who it&apos;s for</span>
              <h2 id="who-title">Built for digital technology professionals</h2>
              <p>We currently specialise in the Digital Technology route.</p>
            </div>
            <ul className="h-roles">
              {roles.map((r) => <li key={r}>{r}</li>)}
            </ul>

            <div className="h-tracks">
              <h3 className="h-tracks-title">Exceptional Talent or Exceptional Promise?</h3>
              <div className="h-tracks-grid">
                <div>
                  <h4>Exceptional Talent</h4>
                  <p>Established leaders with a proven track record.</p>
                </div>
                <div>
                  <h4>Exceptional Promise</h4>
                  <p>Emerging leaders who can demonstrate clear potential.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 — Where are you right now? (pathway selector) */}
        <section className="h-section h-paths" id="path" aria-labelledby="path-title">
          <div className="container">
            <div className="h-head">
              <span className="h-eyebrow"><span className="h-num">03</span> Find your path</span>
              <h2 id="path-title">Where are you right now?</h2>
              <p>You don&apos;t need the same service as everyone else. Choose the situation that sounds most like you.</p>
            </div>
            <div className="h-path-grid">
              {paths.map((p) => (
                <article className={`h-path h-path-${p.key}`} key={p.key} aria-labelledby={`path-${p.key}-title`}>
                  <div className="h-path-top">
                    <span className="h-path-label">{p.label}</span>
                    <h3 id={`path-${p.key}-title`}>&ldquo;{p.headline}&rdquo;</h3>
                    <p className="h-path-statement">{p.statement}</p>
                  </div>
                  <div className="h-path-body">
                    <span className="h-path-rec">{p.key === "a" ? "Recommended next step" : "Recommended service"}</span>
                    <p className="h-path-next">{p.next}</p>
                    <p className="h-path-meta">
                      {p.meta.map((m, i) => (
                        <span key={m} className={i === 0 ? "price" : undefined}>{m}</span>
                      ))}
                    </p>
                    <p className="h-path-explain">{p.explain}</p>

                    {p.route ? (
                      <ol className="h-route" aria-label="Your route">
                        {p.route.map((r) => <li key={r}>{r}</li>)}
                      </ol>
                    ) : (
                      <p className="h-route h-route-direct">
                        <strong>Direct route</strong> — skips the free eligibility check
                      </p>
                    )}

                    <details className="h-path-more">
                      <summary>{p.detailsTitle}</summary>
                      <ul>{p.details.map((d) => <li key={d}>{d}</li>)}</ul>
                    </details>

                    <div className="h-path-cta">
                      <Link href={p.cta.href} className={`btn btn-block ${p.key === "c" ? "btn-gold" : "btn-primary"}`}>
                        {p.cta.label}
                      </Link>
                      {p.note && <p className="h-path-note">{p.note}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — Trust / founder */}
        <section className="h-section h-dark" id="founder" aria-labelledby="founder-title">
          <div className="container h-founder">
            <div className="h-founder-photo">
              <Image
                src={site.founder.photo}
                alt={`${site.founder.name}, founder of Global Talent Lab`}
                width={720}
                height={1080}
                sizes="(min-width: 900px) 380px, 90vw"
              />
            </div>
            <div>
              <span className="h-eyebrow"><span className="h-num">04</span> Why trust us</span>
              <h2 id="founder-title">Built by someone who has been through it.</h2>
              <p className="h-founder-lead">
                {site.founder.name} went through the UK Global Talent process himself as a technology professional, later obtained ILR and British citizenship, and
                works in data and technology in the UK.
              </p>
              <ul className="h-trust">
                {trustPoints.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <p className="h-founder-small">
                It&apos;s evidence-first coaching — helping you understand, structure and present your evidence — not agent-style &ldquo;we&apos;ll handle
                everything&rdquo;.
              </p>
              <details className="proof">
                <summary>See my endorsement confirmation (cropped)</summary>
                <Image
                  src="/img/endorsement.webp"
                  alt="Cropped screenshot of the founder's Global Talent endorsement email"
                  width={900}
                  height={870}
                  sizes="(min-width: 900px) 600px, 90vw"
                />
              </details>
              <div className="btn-row" style={{ marginTop: 24 }}>
                <a href="#path" className="btn btn-primary">Find My Path</a>
                <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light">
                  View LinkedIn<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 6 — How we help: three stages, services mapped underneath */}
        <section className="h-section h-how" id="how" aria-labelledby="how-title">
          <span id="services" className="h-anchor" aria-hidden="true" />
          <div className="container">
            <div className="h-head">
              <span className="h-eyebrow"><span className="h-num">05</span> How we help</span>
              <h2 id="how-title">Three stages. Start wherever you are.</h2>
              <p>
                Most applicants should start with the free profile check. If you&apos;ve already prepared your application and only need it reviewed before
                submission, you can go straight to the Application Audit.
              </p>
            </div>
            <ol className="h-stages">
              <li className="h-stage">
                <span className="h-stage-n">Stage 1</span>
                <h3>Understand where you stand</h3>
                <div className="h-svc">
                  <div className="h-svc-top"><strong>Free Profile Check</strong><span className="h-svc-price">£0</span></div>
                  <p>About 3 minutes online. An instant preliminary view of whether your profile is worth investigating.</p>
                </div>
                <div className="h-svc">
                  <div className="h-svc-top"><strong>{review.name}</strong><span className="h-svc-price">{reviewPrice}</span></div>
                  <p>{review.duration}. Criteria that could be relevant, your strongest evidence, obvious gaps and a clear next step. Available after the free check.</p>
                </div>
                <Link href="/assessment" className="btn btn-primary btn-block">Check My Profile — Free</Link>
              </li>
              <li className="h-stage">
                <span className="h-stage-n">Stage 2</span>
                <h3>Build the strongest application you can</h3>
                <div className="h-svc">
                  <div className="h-svc-top"><strong>{strategy.name}</strong><span className="h-svc-price">{formatGBP(strategy.pricePence)}</span></div>
                  <p>{strategy.duration}. {strategy.summary}</p>
                  <ul>{strategy.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
                </div>
                <p className="h-stage-note">Offered after the eligibility review, once we both know it&apos;s the right fit.</p>
                <Link href="/assessment" className="btn btn-secondary btn-block">Start With My Profile</Link>
              </li>
              <li className="h-stage">
                <span className="h-stage-n">Stage 3</span>
                <h3>Stress-test it before submission</h3>
                <div className="h-svc">
                  <div className="h-svc-top"><strong>{audit.name}</strong><span className="h-svc-price">{formatGBP(audit.pricePence)}</span></div>
                  <p>{audit.duration}. {audit.summary}</p>
                  <ul>{audit.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
                </div>
                <p className="h-stage-note">No eligibility questionnaire — a few short questions about your application, then pay and book.</p>
                <Link href="/audit" className="btn btn-secondary btn-block">Get My Application Reviewed</Link>
              </li>
            </ol>
            <p className="h-qa">
              Already preparing and just need answers on referees or your personal statement? A {products.qa.name} ({formatGBP(products.qa.pricePence)}) is also
              available —{" "}
              <a href={`mailto:${site.contactEmail}?subject=${encodeURIComponent("1-Hour Q&A enquiry")}`}>email us</a>.
            </p>
          </div>
        </section>

        {/* 7 — Our approach */}
        <section className="h-section h-honest" id="honest" aria-labelledby="honest-title">
          <div className="container">
            <figure className="h-honest-inner">
              <span className="h-eyebrow"><span className="h-num">06</span> Our approach</span>
              <h2 id="honest-title">Sometimes the right advice is not to apply yet.</h2>
              <p>
                If your current evidence is unlikely to support a strong application, we&apos;d rather identify the gaps than encourage you to spend significant time
                and money applying too early.
              </p>
            </figure>
          </div>
        </section>

        {/* 8 — Testimonials (only genuine ones; hidden until added in site-config) */}
        {testimonials.length > 0 && (
          <section className="h-section" id="testimonials" aria-labelledby="testimonials-title">
            <div className="container">
              <div className="h-head">
                <span className="h-eyebrow">Client feedback</span>
                <h2 id="testimonials-title">What candidates say about the review</h2>
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
        <section className="h-section h-faq" id="faq" aria-labelledby="faq-title">
          <div className="container narrow">
            <div className="h-head">
              <span className="h-eyebrow"><span className="h-num">07</span> FAQ</span>
              <h2 id="faq-title">Questions before you start</h2>
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
        <section className="h-section h-dark h-final" id="final-cta" aria-labelledby="final-title">
          <div className="container narrow">
            <h2 id="final-title">Still not sure where you fit?</h2>
            <p>
              Start with the free profile check. It takes about 3 minutes and gives you a preliminary view of whether your career profile is worth exploring
              further.
            </p>
            <Link href="/assessment" className="btn btn-primary btn-lg">{site.primaryCta}</Link>
            <p className="h-final-alt">
              <Link href="/audit">Already have an application? Get it audited instead.</Link>
            </p>
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
    </div>
  );
}
