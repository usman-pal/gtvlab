"use client";
import { useState } from "react";

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function LinkBuilder({ base }: { base: string }) {
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("influencer");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const q = new URLSearchParams();
  if (source) q.set("utm_source", slug(source));
  if (medium) q.set("utm_medium", slug(medium));
  if (campaign) q.set("utm_campaign", slug(campaign));
  if (content) q.set("utm_content", slug(content));
  const url = `${base}/${q.toString() ? `?${q}` : ""}`;
  return (
    <div>
      <div className="filters">
        <label>Creator / source<input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="creatorname" /></label>
        <label>Medium<input className="input" value={medium} onChange={(e) => setMedium(e.target.value)} /></label>
        <label>Campaign<input className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="gt_oct26" /></label>
        <label>Content<input className="input" value={content} onChange={(e) => setContent(e.target.value)} placeholder="optional, e.g. reel_1" /></label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input className="input" readOnly value={url} style={{ fontSize: 13 }} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="btn btn-dark"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="xs muted" style={{ marginTop: 8 }}>Short form also works: {base}/?ref=creatorname (recorded as source=creatorname, medium=referral).</p>
    </div>
  );
}
