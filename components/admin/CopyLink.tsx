"use client";
import { useState } from "react";

export default function CopyLink({ url, label = "Copy Invitation Link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy the invitation link:", url);
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
