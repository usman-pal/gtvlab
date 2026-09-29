"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PROFESSIONS, EXPERIENCE, SENIORITY, EVIDENCE, HELP_WANTED, ACHIEVEMENT_MAX, TOTAL_STEPS, type Option } from "@/lib/assessment-options";
import { COUNTRIES } from "@/lib/countries";
import { getAttribution, track, visitorId } from "@/lib/client/tracking";

type Draft = {
  step: number;
  profession: string;
  professionOther: string;
  experience: string;
  seniority: string;
  evidence: string[];
  evidenceOther: string;
  achievement: string;
  helpWanted: string;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  linkedin: string;
  consentContact: boolean;
  consentWhatsapp: boolean;
};

const EMPTY: Draft = {
  step: 1,
  profession: "",
  professionOther: "",
  experience: "",
  seniority: "",
  evidence: [],
  evidenceOther: "",
  achievement: "",
  helpWanted: "",
  name: "",
  email: "",
  whatsapp: "",
  country: "",
  linkedin: "",
  consentContact: false,
  consentWhatsapp: false,
};

const KEY = "gtl_assessment_draft_v1";
const ACH_MIN = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s()-]{8,20}$/;

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft & { savedAt?: number };
    // Drafts expire after 30 days
    if (d.savedAt && Date.now() - d.savedAt > 30 * 864e5) return null;
    return { ...EMPTY, ...d };
  } catch {
    return null;
  }
}

export default function AssessmentForm() {
  const router = useRouter();
  const [d, setD] = useState<Draft>(EMPTY);
  const [ready, setReady] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hp, setHp] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const startedAt = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft (form recovery)
  useEffect(() => {
    const saved = loadDraft();
    if (saved && (saved.step > 1 || saved.profession)) {
      setD(saved);
      setResumed(true);
    } else {
      track("assessment_started");
    }
    setReady(true);
  }, []);

  // Persist draft on every change (contact details only kept locally in the browser)
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
    } catch {}
  }, [d, ready]);

  useEffect(() => {
    if (!ready) return;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [d.step, ready]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  function validate(step: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!d.profession) e.profession = "Please choose the area you primarily work in.";
      if (d.profession === "other" && d.professionOther.trim().length < 2) e.professionOther = "Please describe your profession.";
    }
    if (step === 2 && !d.experience) e.experience = "Please choose one option.";
    if (step === 3 && !d.seniority) e.seniority = "Please choose one option.";
    if (step === 4 && d.evidence.length === 0) e.evidence = "Choose all that apply — or “None of these”.";
    if (step === 5 && d.achievement.trim().length < ACH_MIN) e.achievement = `Please add a little more detail (at least ${ACH_MIN} characters).`;
    if (step === 6 && !d.helpWanted) e.helpWanted = "Please choose one option.";
    if (step === 7) {
      if (d.name.trim().length < 2) e.name = "Please enter your full name.";
      if (!EMAIL_RE.test(d.email.trim())) e.email = "Please enter a valid email address.";
      if (!PHONE_RE.test(d.whatsapp.trim()) || !d.whatsapp.trim().startsWith("+")) e.whatsapp = "Include your country code, e.g. +44 7700 900123.";
      if (!d.country.trim()) e.country = "Please enter your country of residence.";
      if (!d.consentContact) e.consentContact = "Please confirm so we can send you your result.";
    }
    return e;
  }

  function next() {
    const e = validate(d.step);
    if (Object.values(e).some(Boolean)) {
      setErrors(e);
      return;
    }
    track("assessment_step_completed", { step: d.step });
    if (d.step < TOTAL_STEPS) set("step", d.step + 1);
    else submit();
  }

  function back() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (d.step > 1) set("step", d.step - 1);
  }

  /** Single-choice questions advance automatically after a short pause. */
  function choose(k: "profession" | "experience" | "seniority" | "helpWanted", v: string) {
    set(k, v);
    if (k === "profession" && v === "other") return; // need free text first
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const step = d.step;
    advanceTimer.current = setTimeout(() => {
      track("assessment_step_completed", { step });
      setD((prev) => (prev.step === step ? { ...prev, step: step + 1 } : prev));
    }, 280);
  }

  function toggleEvidence(v: string) {
    setD((prev) => {
      let ev = prev.evidence.includes(v) ? prev.evidence.filter((x) => x !== v) : [...prev.evidence, v];
      if (v === "none" && ev.includes("none")) ev = ["none"];
      else ev = ev.filter((x) => x !== "none");
      return { ...prev, evidence: ev };
    });
    setErrors((e) => ({ ...e, evidence: "" }));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError("");
    const attr = getAttribution();
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { ...d, step: undefined },
          attribution: attr.first ?? null,
          lastTouch: attr.last ?? null,
          visitorId: visitorId(),
          website: hp, // honeypot
          elapsedMs: Date.now() - startedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || "Something went wrong. Please try again.");
      // Server records these internally; send to GA/Meta (if consented) as generic stage events only.
      track("assessment_completed", {}, { internal: false });
      track(`lead_${String(data.grade).toLowerCase()}`, {}, { internal: false });
      try { localStorage.removeItem(KEY); } catch {}
      router.push(`/assessment/result/${data.token}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function restart() {
    try { localStorage.removeItem(KEY); } catch {}
    setD(EMPTY);
    setResumed(false);
    track("assessment_started", { restarted: true });
  }

  if (!ready) return <div style={{ minHeight: 480 }} aria-busy="true" />;

  const pct = Math.round(((d.step - 1) / TOTAL_STEPS) * 100);
  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="err" role="alert">{errors[k]}</p> : null);

  const Radio = ({ name, list, value, onPick, two }: { name: string; list: Option[]; value: string; onPick: (v: string) => void; two?: boolean }) => (
    <div className={`options${two ? " two" : ""}`} role="radiogroup" aria-labelledby="q-title">
      {list.map((o) => (
        <label key={o.value} className={`opt${value === o.value ? " selected" : ""}`}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onPick(o.value)} />
          <span className="mark" aria-hidden="true" />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="container narrow">
      {resumed && d.step > 1 && (
        <div className="callout neutral resume small">
          <strong>Welcome back.</strong> We saved your answers so you can continue where you left off.{" "}
          <button type="button" onClick={restart} style={{ background: "none", border: 0, color: "var(--teal-d)", textDecoration: "underline", cursor: "pointer", font: "inherit", padding: 0 }}>
            Start again
          </button>
        </div>
      )}

      <div className="progress" aria-label={`Step ${d.step} of ${TOTAL_STEPS}`}>
        <div className="progress-top">
          <span>Step {d.step} of {TOTAL_STEPS}</span>
          <span>{d.step === TOTAL_STEPS ? "Last step" : `~${Math.max(1, Math.ceil(((TOTAL_STEPS - d.step + 1) * 25) / 60))} min left`}</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(pct, 4)}%` }} /></div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        noValidate
      >
        <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={hp} onChange={(e) => setHp(e.target.value)} />

        {d.step === 1 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h1 className="q-title" id="q-title" tabIndex={-1} ref={headingRef}>What area do you primarily work in?</h1>
            <p className="q-help">Choose the closest match.</p>
            <Radio name="profession" list={PROFESSIONS} value={d.profession} onPick={(v) => choose("profession", v)} two />
            <Err k="profession" />
            {d.profession === "other" && (
              <label className="field" style={{ marginTop: 16 }}>
                <span>Please describe your profession</span>
                <input className={`input${errors.professionOther ? " invalid" : ""}`} value={d.professionOther} onChange={(e) => set("professionOther", e.target.value)} maxLength={120} autoFocus />
                <Err k="professionOther" />
              </label>
            )}
          </fieldset>
        )}

        {d.step === 2 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h1 className="q-title" id="q-title" tabIndex={-1} ref={headingRef}>How many years of professional experience do you have?</h1>
            <p className="q-help">In technology or closely related work.</p>
            <Radio name="experience" list={EXPERIENCE} value={d.experience} onPick={(v) => choose("experience", v)} />
            <Err k="experience" />
          </fieldset>
        )}

        {d.step === 3 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h1 className="q-title" id="q-title" tabIndex={-1} ref={headingRef}>Which best describes your current or most recent role?</h1>
            <p className="q-help">&nbsp;</p>
            <Radio name="seniority" list={SENIORITY} value={d.seniority} onPick={(v) => choose("seniority", v)} two />
            <Err k="seniority" />
          </fieldset>
        )}

        {d.step === 4 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h1 className="q-title" id="q-title" tabIndex={-1} ref={headingRef}>Which types of career evidence do you already have?</h1>
            <p className="q-help">Select all that apply. Be honest — this helps us give you a useful result.</p>
            <div className="options two" role="group" aria-labelledby="q-title">
              {EVIDENCE.map((o) => {
                const on = d.evidence.includes(o.value);
                return (
                  <label key={o.value} className={`opt multi${on ? " selected" : ""}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleEvidence(o.value)} />
                    <span className="mark" aria-hidden="true" />
                    <span>{o.label}</span>
                  </label>
                );
              })}
            </div>
            <Err k="evidence" />
            {d.evidence.includes("other") && (
              <label className="field" style={{ marginTop: 16 }}>
                <span>Other evidence <em>(optional)</em></span>
                <input className="input" value={d.evidenceOther} onChange={(e) => set("evidenceOther", e.target.value)} maxLength={200} />
              </label>
            )}
          </fieldset>
        )}

        {d.step === 5 && (
          <div>
            <h1 className="q-title" id="q-title" tabIndex={-1} ref={headingRef}>Tell us about your strongest career achievement</h1>
            <p className="q-help">
              For example: a product you built, measurable business impact, technical innovation, company growth, industry recognition, research, leadership or contribution
              outside your day-to-day job. Numbers help.
            </p>
            <label className="field">
              <span className="sr-only" style={{ position: "absolute", left: -9999 }}>Your strongest achievement</span>
              <textarea
                className={`input${errors.achievement ? " invalid" : ""}`}
                value={d.achievement}
                onChange={(e) => set("achievement", e.target.value.slice(0, ACHIEVEMENT_MAX))}
                maxLength={ACHIEVEMENT_MAX}
                placeholder="e.g. I led the redesign of our payments platform, which now processes £2bn a year and cut failed transactions by 30%…"
              />
              <div className="counter">{d.achievement.length} / {ACHIEVEMENT_MAX}</div>
              <Err k="achievement" />
            </label>
          </div>
        )}

        {d.step === 6 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h1 className="q-title" id="q-title" tabIndex={-1} ref={headingRef}>What would you most like help with?</h1>
            <p className="q-help">Choose the one that matters most right now.</p>
            <Radio name="helpWanted" list={HELP_WANTED} value={d.helpWanted} onPick={(v) => choose("helpWanted", v)} />
            <Err k="helpWanted" />
          </fieldset>
        )}

        {d.step === 7 && (
          <div>
            <h1 className="q-title" id="q-title" tabIndex={-1} ref={headingRef}>Where should we send your result?</h1>
            <p className="q-help">You&apos;ll see your preliminary result on the next screen, and we&apos;ll email you a copy.</p>
            <label className="field">
              <span>Full name</span>
              <input className={`input${errors.name ? " invalid" : ""}`} value={d.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={120} />
              <Err k="name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input className={`input${errors.email ? " invalid" : ""}`} type="email" inputMode="email" value={d.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" maxLength={200} />
              <Err k="email" />
            </label>
            <label className="field">
              <span>WhatsApp number <em>including country code</em></span>
              <input className={`input${errors.whatsapp ? " invalid" : ""}`} type="tel" inputMode="tel" value={d.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} autoComplete="tel" placeholder="+44 7700 900123" maxLength={24} />
              <Err k="whatsapp" />
            </label>
            <label className="field">
              <span>Country of residence</span>
              <input className={`input${errors.country ? " invalid" : ""}`} list="countries" value={d.country} onChange={(e) => set("country", e.target.value)} autoComplete="country-name" maxLength={80} />
              <datalist id="countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
              <Err k="country" />
            </label>
            <label className="field">
              <span>LinkedIn profile <em>(optional — helps if you book a review)</em></span>
              <input className="input" type="url" inputMode="url" value={d.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://www.linkedin.com/in/…" maxLength={200} />
            </label>
            <label className="check">
              <input type="checkbox" checked={d.consentContact} onChange={(e) => set("consentContact", e.target.checked)} />
              <span>
                I agree that Global Talent Lab may contact me about my assessment and relevant services. I can unsubscribe at any time. See our{" "}
                <Link href="/privacy" target="_blank">privacy policy</Link>.
              </span>
            </label>
            <Err k="consentContact" />
            <label className="check">
              <input type="checkbox" checked={d.consentWhatsapp} onChange={(e) => set("consentWhatsapp", e.target.checked)} />
              <span>You may also contact me on WhatsApp about my result (optional).</span>
            </label>
            <p className="xs muted">
              Your answers are stored securely by Global Talent Lab and are never shared with advertisers. This assessment is a preliminary triage, not an immigration or
              eligibility decision.
            </p>
            {submitError && <p className="err" role="alert">{submitError}</p>}
          </div>
        )}

        <div className="nav-btns">
          {d.step > 1 && (
            <button type="button" className="btn btn-ghost" onClick={back} disabled={submitting}>
              Back
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {d.step === TOTAL_STEPS ? (submitting ? "Calculating your result…" : "See my result") : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
