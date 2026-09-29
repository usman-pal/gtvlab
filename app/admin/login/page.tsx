"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function Login() {
  const [state, action, pending] = useActionState(login, null as null | { error?: string });
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 380 }}>
        <form action={action} className="card">
          <h1 style={{ fontSize: "1.3rem" }}>Global Talent Lab — admin</h1>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" name="password" autoComplete="current-password" autoFocus required />
          </label>
          {state?.error && <p className="err">{state.error}</p>}
          <button className="btn btn-dark btn-block" disabled={pending}>Sign in</button>
        </form>
      </div>
    </main>
  );
}
