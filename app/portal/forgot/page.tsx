import Link from "next/link";
import { ForgotForm } from "@/components/portal/forms";

export default function Forgot() {
  return (
    <main className="container">
      <div className="portal-auth">
        <div className="card">
          <h1 style={{ fontSize: "1.5rem" }}>Reset your password</h1>
          <p className="small muted">Enter the email you use for the portal and we&apos;ll send you a reset link.</p>
          <ForgotForm />
          <p className="small center" style={{ marginTop: 14 }}><Link href="/portal/login">Back to sign in</Link></p>
        </div>
      </div>
    </main>
  );
}
