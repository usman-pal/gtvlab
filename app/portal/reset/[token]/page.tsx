import { ResetForm } from "@/components/portal/forms";

export default async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="container">
      <div className="portal-auth">
        <div className="card">
          <h1 style={{ fontSize: "1.5rem" }}>Choose a new password</h1>
          <ResetForm token={token} />
        </div>
      </div>
    </main>
  );
}
