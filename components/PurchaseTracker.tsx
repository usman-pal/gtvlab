"use client";
import { useEffect } from "react";
import { track } from "@/lib/client/tracking";

/** Sends a purchase / booking conversion to GA4 & ad pixels once (the server already recorded it internally). */
export default function PurchaseTracker({ event, value, onceKey }: { event: string; value?: number; onceKey: string }) {
  useEffect(() => {
    try {
      if (localStorage.getItem(`gtl_conv_${onceKey}`)) return;
      localStorage.setItem(`gtl_conv_${onceKey}`, "1");
    } catch {}
    track(event, value ? { value, currency: "GBP" } : {}, { internal: false });
  }, [event, value, onceKey]);
  return null;
}
