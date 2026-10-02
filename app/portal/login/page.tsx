import { redirect } from "next/navigation";
import { getPortalViewer } from "@/lib/client-auth";
import { LoginForm } from "@/components/portal/forms";

export default async function PortalLogin() {
  const viewer = await getPortalViewer();
  if (viewer && !viewer.preview) redirect("/portal");
  return (
    <main className="container">
      <div className="portal-auth">
        <div className="card">
          <h1 style={{ fontSize: "1.5rem" }}>Client Portal Login</h1>
          <p className="small muted">Sign in to your private Global Talent Lab workspace.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
