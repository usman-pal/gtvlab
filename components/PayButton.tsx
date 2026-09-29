"use client";
import { useState } from "react";
import { track } from "@/lib/client/tracking";

type Applied = { code: string; percentOff: number; totalLabel: string };

const linkBtn: React.CSSProperties = { background: "none", border: 0, padding: 0, font: "inherit", color: "var(--teal-d)", textDecoration: "underline", cursor: "pointer" };

/**
 * Posts to /api/checkout (works without JS too) and tracks the click.
 * Includes an optional discount code (re-validated server-side) and a
 * "Having trouble paying?" form that emails Global Talent Lab.
 */
export default function PayButton({
  token,
  product,
  label,
  className = "btn btn-primary btn-lg btn-block",
  codeError,
}: {
  token: string;
  product: string;
  label: string;
  className?: string;
  /** Error from a previous checkout attempt with an invalid code */
  codeError?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(!!codeError);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [codeMsg, setCodeMsg] = useState(codeError ?? "");
  const [checking, setChecking] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  async function applyCode() {
    if (!code.trim()) return;
    setChecking(true);
    setCodeMsg("");
    try {
      const res = await fetch("/api/discount", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, product }) });
      const d = await res.json();
      if (d.ok) {
        setApplied({ code: d.code, percentOff: d.percentOff, totalLabel: d.totalLabel });
        setCode(d.code);
      } else {
        setApplied(null);
        setCodeMsg(d.error || "That code isn't valid.");
      }
    } catch {
      setCodeMsg("Couldn't check the code — please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <form
        action="/api/checkout"
        method="post"
        onSubmit={() => {
          setBusy(true);
          track(product === "review" ? "paid_review_clicked" : "paid_service_clicked", { product });
          // checkout_started is recorded server-side; mirror it to GA / pixels only.
          track("checkout_started", { product }, { internal: false });
        }}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="product" value={product} />
        {applied && <input type="hidden" name="code" value={applied.code} />}

        {showCode && !applied && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className={`input${codeMsg ? " invalid" : ""}`}
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeMsg(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }}
                placeholder="Discount code"
                aria-label="Discount code"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={40}
              />
              <button type="button" className="btn btn-secondary" onClick={applyCode} disabled={checking || !code.trim()}>
                {checking ? "Checking…" : "Apply"}
              </button>
            </div>
            {codeMsg && <p className="err" role="alert">{codeMsg}</p>}
          </div>
        )}
        {applied && (
          <div className="callout small" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <span>
              Code <strong>{applied.code}</strong> applied — {applied.percentOff}% off. New total: <strong>{applied.totalLabel}</strong>
            </span>
            <button type="button" style={linkBtn} onClick={() => { setApplied(null); setCode(""); }}>Remove</button>
          </div>
        )}

        <button type="submit" className={className} disabled={busy}>
          {busy ? "Opening secure checkout…" : applied ? `${label.replace(/£[\d,.]+/, applied.totalLabel === "Free" ? "£0" : applied.totalLabel)}` : label}
        </button>
      </form>

      <p className="xs center" style={{ marginTop: 10, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
        {!showCode && !applied && (
          <button type="button" style={linkBtn} onClick={() => setShowCode(true)}>Have a discount code?</button>
        )}
        <button type="button" style={linkBtn} onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
          Having trouble paying?
        </button>
      </p>
      {showHelp && <PaymentHelp token={token} product={product} />}
    </div>
  );
}

function PaymentHelp({ token, product }: { token: string; product: string }) {
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) { setError("Please tell us briefly what happened."); return; }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/payment-help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, product, country, message }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send — please email us instead.");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Couldn't send — please email us instead.");
    }
  }

  if (state === "sent")
    return (
      <div className="callout small" style={{ marginTop: 10 }} role="status">
        <strong>Thanks — we&apos;ve got your message.</strong> We&apos;ll reply by email within one working day with another way to pay.
      </div>
    );

  return (
    <form onSubmit={send} className="card" style={{ marginTop: 10, boxShadow: "none", textAlign: "left" }}>
      <p className="small" style={{ marginBottom: 12 }}>
        Card declined, or payments not supported where you are? Tell us and we&apos;ll reply by email with another way to pay. We&apos;ll use the email address from your assessment.
      </p>
      <label className="field">
        <span>Country you&apos;re paying from</span>
        <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} autoComplete="country-name" />
      </label>
      <label className="field">
        <span>What happened?</span>
        <textarea className="input" style={{ minHeight: 100 }} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1500} placeholder="e.g. My card was declined / Stripe doesn't accept cards from my country" />
      </label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn btn-dark btn-block" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send to Global Talent Lab"}</button>
    </form>
  );
}
