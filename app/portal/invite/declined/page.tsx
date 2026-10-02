import { site } from "@/lib/site-config";

export default function Declined() {
  return (
    <main className="container">
      <div className="portal-auth">
        <div className="card">
          <h1 style={{ fontSize: "1.5rem" }}>Thanks for letting us know</h1>
          <p>We&apos;ve noted that you don&apos;t want to continue right now. If that changes, email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we&apos;ll send you a new invitation.</p>
        </div>
      </div>
    </main>
  );
}
