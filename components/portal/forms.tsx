"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, createAccount, requestReset, resetPassword, changePassword } from "@/app/portal/actions";

type State = { error?: string; ok?: string } | null;

const Msg = ({ s }: { s: State }) => (s?.error ? <p className="err" role="alert">{s.error}</p> : s?.ok ? <p className="callout small" role="status">{s.ok}</p> : null);

const Pw = ({ name, label, auto, hint }: { name: string; label: string; auto: string; hint?: string }) => (
  <label className="field">
    <span>{label}{hint && <em> — {hint}</em>}</span>
    <input className="input" type="password" name={name} autoComplete={auto} required minLength={name === "current" ? 1 : 10} maxLength={200} />
  </label>
);

export function LoginForm() {
  const [s, action, pending] = useActionState(login, null as State);
  return (
    <form action={action}>
      <label className="field"><span>Email</span><input className="input" type="email" name="email" autoComplete="email" required autoFocus /></label>
      <Pw name="password" label="Password" auto="current-password" />
      <Msg s={s} />
      <button className="btn btn-dark btn-block" disabled={pending}>Sign in</button>
      <p className="small center" style={{ marginTop: 14 }}><Link href="/portal/forgot">Forgot your password?</Link></p>
    </form>
  );
}

export function CreateAccountForm({ token, name, email }: { token: string; name: string; email: string }) {
  const [s, action, pending] = useActionState(createAccount, null as State);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <label className="field"><span>Name</span><input className="input" value={name} readOnly /></label>
      <label className="field"><span>Email <em>— your invited email</em></span><input className="input" type="email" value={email} readOnly autoComplete="username" /></label>
      <Pw name="password" label="Password" auto="new-password" hint="at least 10 characters" />
      <Pw name="confirm" label="Confirm password" auto="new-password" />
      <Msg s={s} />
      <button className="btn btn-primary btn-lg btn-block" disabled={pending}>Create my account</button>
    </form>
  );
}

export function ForgotForm() {
  const [s, action, pending] = useActionState(requestReset, null as State);
  return (
    <form action={action}>
      <label className="field"><span>Email</span><input className="input" type="email" name="email" autoComplete="email" required autoFocus /></label>
      <Msg s={s} />
      <button className="btn btn-dark btn-block" disabled={pending}>Send reset link</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState(resetPassword, null as State);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <Pw name="password" label="New password" auto="new-password" hint="at least 10 characters" />
      <Pw name="confirm" label="Confirm new password" auto="new-password" />
      <Msg s={s} />
      <button className="btn btn-dark btn-block" disabled={pending}>Set new password</button>
    </form>
  );
}

export function ChangePasswordForm({ disabled }: { disabled: boolean }) {
  const [s, action, pending] = useActionState(changePassword, null as State);
  return (
    <form action={action}>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0 }}>
        <Pw name="current" label="Current password" auto="current-password" />
        <Pw name="password" label="New password" auto="new-password" hint="at least 10 characters" />
        <Pw name="confirm" label="Confirm new password" auto="new-password" />
        <Msg s={s} />
        <button className="btn btn-dark" disabled={pending}>Update password</button>
      </fieldset>
    </form>
  );
}
