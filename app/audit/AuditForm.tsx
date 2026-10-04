"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAttribution, track, visitorId } from "@/lib/client/tracking";
import { COUNTRIES } from "@/lib/countries";
import { ROUTES, CRITERIA, PARTS, READINESS, YES_NO, SUBMIT_WHEN, CONCERNS_MAX, type Opt } from "@/lib/audit-options";

type Data = {
  route: string;
  criteria: string[];
  readiness: Record<string, string>;
  submitted: string;
  submitWhen: string;
  refused: string;
  concerns: string;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  linkedin: string;
  consentContact: boolean;
  consentWhatsapp: boolean;
};

const EMPTY: Data = { route: "", criteria: [], readiness: {}, submitted: "", submitWhen: "", refused: "", concerns: "", name: "", email: "", whatsapp: "", country: "", linkedin: "", consentContact: false, consentWhatsapp: false };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Choice({ opts, value, onPick, name, two = true }: { opts: Opt[]; value: string; onPick: (v: string) => void; name: string; two?: boolean }) {
  return (
    <div className={`options${two ? " two" : ""}`} role="radiogroup">
      {opts.map((o) => (
        <label key={o.value} className={`opt${value === o.value ? " selected" : ""}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onPick(o.value)} />
          <span className="mark" />
          <span>
            {o.label}
            {o.hint && <span className="xs muted" style={{ display: "block", fontWeight: 400 }}>{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

function Q({ n, title, help, err, children }: { n: number; title: string; help?: string; err?: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: "0 0 30px" }}>
      <legend className="q-title" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
        <span className="muted" style={{ marginRight: 6 }}>{n}.</span>{title}
      </legend>
      {help && <p className="small muted" style={{ margin: "0 0 10px" }}>{help}</p>}
      {children}
      {err && <p className="err" role="alert">{err}</p>}
    </fieldset>
  );
}

export default function AuditForm() {
  const router = useRouter();
  const [d, setD] = useState<Data>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Data, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hp, setHp] = useState("");
  const started = useRef(false);

  const set = <K extends keyof Data>(k: K, v: Data[K]) => {
    if (!started.current) {
      started.current = true;
      track("audit_intake_started");
    }
    setD((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate() {
    const e: typeof errors = {};
    if (!d.route) e.route = "Please choose a route.";
    if (!d.criteria.length) e.criteria = "Choose at least one — or “Not sure yet”.";
    if (PARTS.some((p) => !d.readiness[p.value])) e.readiness = "Please answer for each part.";
    if (!d.submitted) e.submitted = "Please choose one.";
    if (d.submitted === "no" && !d.submitWhen) e.submitWhen = "Please choose one.";
    if (!d.refused) e.refused = "Please choose one.";
    if (d.name.trim().length < 2) e.name = "Please enter your name.";
    if (!EMAIL_RE.test(d.email.trim())) e.email = "Please enter a valid email.";
    if (d.whatsapp.trim() && !/^\+[\d\s()-]{7,20}$/.test(d.whatsapp.trim())) e.whatsapp = "Include your country code, e.g. +44 7700 900123.";
    if (!d.consentContact) e.consentContact = "Please confirm so we can contact you about your audit.";
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) document.getElementById(`q-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !firstKey;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    const attr = getAttribution();
    try {
      const res = await fetch("/api/audit/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: d, attribution: attr.first ?? null, lastTouch: attr.last ?? null, visitorId: visitorId(), website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || "Something went wrong. Please try again.");
      track("audit_intake_completed", {}, { internal: false });
      router.push(`/audit/${data.token}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card" style={{ padding: "26px 22px" }}>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={hp} onChange={(e) => setHp(e.target.value)} />

      <div id="q-route">
        <Q n={1} title="Which route are you applying under?" err={errors.route}>
          <Choice name="route" opts={ROUTES} value={d.route} onPick={(v) => set("route", v)} two={false} />
        </Q>
      </div>

      <div id="q-criteria">
        <Q n={2} title="Which optional criteria are you claiming?" help="You need to meet two of the four. Choose all you're planning to use." err={errors.criteria}>
          <div className="options" role="group">
            {CRITERIA.map((o) => {
              const on = d.criteria.includes(o.value);
              return (
                <label key={o.value} className={`opt multi${on ? " selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      // "Not sure yet" is exclusive of the specific criteria.
                      const next = o.value === "unsure" ? (on ? [] : ["unsure"]) : on ? d.criteria.filter((c) => c !== o.value) : [...d.criteria.filter((c) => c !== "unsure"), o.value];
                      set("criteria", next);
                    }}
                  />
                  <span className="mark" />
                  <span>
                    {o.label}
                    {o.hint && <span className="xs muted" style={{ display: "block", fontWeight: 400 }}>{o.hint}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </Q>
      </div>

      <div id="q-readiness">
        <Q n={3} title="How complete is your application?" err={errors.readiness}>
          <div className="table-wrap" style={{ boxShadow: "none" }}>
            <table className="t" style={{ fontSize: 14 }}>
              <thead>
                <tr><th></th>{READINESS.map((r) => <th key={r.value} className="center">{r.label}</th>)}</tr>
              </thead>
              <tbody>
                {PARTS.map((p) => (
                  <tr key={p.value}>
                    <td style={{ whiteSpace: "normal", fontWeight: 600, color: "var(--ink)" }}>{p.label}</td>
                    {READINESS.map((r) => (
                      <td key={r.value} className="center">
                        <input
                          type="radio"
                          name={`ready-${p.value}`}
                          aria-label={`${p.label}: ${r.label}`}
                          checked={d.readiness[p.value] === r.value}
                          onChange={() => set("readiness", { ...d.readiness, [p.value]: r.value })}
                          style={{ width: 20, height: 20, accentColor: "var(--teal-d)" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Q>
      </div>

      <div id="q-submitted">
        <Q n={4} title="Have you already submitted your application?" err={errors.submitted}>
          <Choice name="submitted" opts={YES_NO} value={d.submitted} onPick={(v) => set("submitted", v)} />
        </Q>
      </div>

      {d.submitted !== "yes" && (
        <div id="q-submitWhen">
          <Q n={5} title="When do you plan to submit?" err={errors.submitWhen}>
            <Choice name="submitWhen" opts={SUBMIT_WHEN} value={d.submitWhen} onPick={(v) => set("submitWhen", v)} />
          </Q>
        </div>
      )}

      <div id="q-refused">
        <Q n={d.submitted === "yes" ? 5 : 6} title="Have you previously received an endorsement refusal?" err={errors.refused}>
          <Choice name="refused" opts={YES_NO} value={d.refused} onPick={(v) => set("refused", v)} />
        </Q>
      </div>

      <Q n={d.submitted === "yes" ? 6 : 7} title="Anything you're particularly concerned about?" help="Optional — e.g. a weak criterion, a referee, the personal statement, or refusal feedback.">
        <textarea className="input" value={d.concerns} maxLength={CONCERNS_MAX} onChange={(e) => set("concerns", e.target.value)} style={{ minHeight: 110 }} />
      </Q>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "6px 0 24px" }} />
      <h3>Your details</h3>
      <div className="grid g2" style={{ gap: "0 16px" }}>
        <label className="field" id="q-name">
          <span>Full name</span>
          <input className={`input${errors.name ? " invalid" : ""}`} value={d.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={120} />
          {errors.name && <p className="err">{errors.name}</p>}
        </label>
        <label className="field" id="q-email">
          <span>Email</span>
          <input className={`input${errors.email ? " invalid" : ""}`} type="email" value={d.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" maxLength={200} />
          {errors.email && <p className="err">{errors.email}</p>}
        </label>
        <label className="field" id="q-whatsapp">
          <span>WhatsApp <em>(optional, with country code)</em></span>
          <input className={`input${errors.whatsapp ? " invalid" : ""}`} type="tel" value={d.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} autoComplete="tel" placeholder="+44 7700 900123" maxLength={24} />
          {errors.whatsapp && <p className="err">{errors.whatsapp}</p>}
        </label>
        <label className="field">
          <span>Country of residence <em>(optional)</em></span>
          <input className="input" list="countries" value={d.country} onChange={(e) => set("country", e.target.value)} autoComplete="country-name" maxLength={80} />
          <datalist id="countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
      </div>
      <label className="field">
        <span>LinkedIn profile <em>(optional)</em></span>
        <input className="input" type="url" inputMode="url" value={d.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://www.linkedin.com/in/…" maxLength={200} />
      </label>
      <label className="check" id="q-consentContact">
        <input type="checkbox" checked={d.consentContact} onChange={(e) => set("consentContact", e.target.checked)} />
        <span>
          I agree that Global Talent Lab may contact me about my Application Audit. See our <Link href="/privacy" target="_blank">privacy policy</Link>.
        </span>
      </label>
      {errors.consentContact && <p className="err">{errors.consentContact}</p>}
      <label className="check">
        <input type="checkbox" checked={d.consentWhatsapp} onChange={(e) => set("consentWhatsapp", e.target.checked)} />
        <span>You may also contact me on WhatsApp about my audit (optional).</span>
      </label>

      {submitError && <p className="err" role="alert">{submitError}</p>}
      <button className="btn btn-primary btn-lg btn-block" disabled={submitting} style={{ marginTop: 18 }}>
        {submitting ? "Saving…" : "Continue — see the service and price"}
      </button>
    </form>
  );
}
