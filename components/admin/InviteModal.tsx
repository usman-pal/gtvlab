"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { inviteForStrategy } from "@/app/admin/strategy-actions";

const EXAMPLE =
  "Based on our Eligibility Review, I believe your profile has a credible route forward and I'd be happy to work with you on developing the application.";

/** "Invite for Application Strategy" — opens a confirmation modal; nothing is sent until "Send Invitation". */
export default function InviteModal({
  leadId,
  name,
  email,
  programme,
  total,
  structure,
  warning,
  label = "Invite for Application Strategy",
}: {
  leadId: string;
  name: string;
  email: string;
  programme: string;
  total: string;
  structure: string;
  warning?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteForStrategy, null as null | { error?: string });
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && setOpen(false);
    window.addEventListener("keydown", onKey);
    dialog.current?.querySelector("textarea")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !pending && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="invite-title" ref={dialog}>
            <h2 id="invite-title">Invite to {programme}</h2>
            <dl className="kv" style={{ gridTemplateColumns: "130px 1fr", margin: "14px 0" }}>
              <dt>Applicant</dt><dd><strong>{name}</strong></dd>
              <dt>Email</dt><dd><strong>{email}</strong></dd>
              <dt>Programme</dt><dd><strong>{programme}</strong></dd>
              <dt>Total</dt><dd><strong>{total}</strong></dd>
              <dt>Payment structure</dt><dd><strong>{structure}</strong></dd>
            </dl>
            {warning && <p className="callout warn small" style={{ padding: "10px 12px" }}>{warning}</p>}
            <form action={action}>
              <input type="hidden" name="leadId" value={leadId} />
              <label className="field" style={{ marginBottom: 12 }}>
                <span>Personal note <em>— optional, shown in the email and invitation page</em></span>
                <textarea className="input" name="note" maxLength={2000} placeholder={EXAMPLE} style={{ minHeight: 110, fontSize: 14 }} />
              </label>
              {state?.error && <p className="err">{state.error}</p>}
              <div className="btn-row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
                <button className="btn btn-dark" disabled={pending}>{pending ? "Sending…" : "Send Invitation"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
