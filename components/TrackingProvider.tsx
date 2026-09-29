"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { captureAttribution, getConsent, setConsent, track } from "@/lib/client/tracking";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/**
 * - Captures UTM / ref attribution on every landing.
 * - Fires one landing_page_view per browser session.
 * - Loads GA4 (consent mode, denied by default), Meta Pixel and Google Ads tags only after opt-in.
 */
export default function TrackingProvider() {
  const pathname = usePathname();
  const [consent, setC] = useState<"granted" | "denied" | null | "loading">("loading");
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    setC(getConsent());
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    captureAttribution();
    try {
      if (!sessionStorage.getItem("gtl_lpv")) {
        sessionStorage.setItem("gtl_lpv", "1");
        track("landing_page_view");
      }
    } catch {
      track("landing_page_view");
    }
  }, [isAdmin]);

  // GA page views on client navigation
  useEffect(() => {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (consent === "granted" && w.gtag && GA_ID) w.gtag("event", "page_view", { page_path: pathname });
  }, [pathname, consent]);

  if (isAdmin) return null;
  const decide = (v: "granted" | "denied") => {
    setConsent(v);
    setC(v);
  };

  return (
    <>
      {consent === "granted" && GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { send_page_view: true });
            ${ADS_ID ? `gtag('config', '${ADS_ID}');` : ""}
          `}</Script>
        </>
      )}
      {consent === "granted" && META_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_ID}');
          fbq('track', 'PageView');
        `}</Script>
      )}
      {consent === null && (
        <div className="consent" role="dialog" aria-live="polite" aria-label="Cookie preferences">
          <p style={{ margin: "0 0 12px" }}>
            We use essential storage to save your assessment progress. With your permission we&apos;d also use analytics and advertising cookies to measure and improve our
            campaigns. We never share your assessment answers with advertisers. <Link href="/privacy">Privacy policy</Link>
          </p>
          <div className="btn-row">
            <button className="btn btn-dark" onClick={() => decide("granted")}>Accept</button>
            <button className="btn btn-ghost" onClick={() => decide("denied")}>Essential only</button>
          </div>
        </div>
      )}
    </>
  );
}
