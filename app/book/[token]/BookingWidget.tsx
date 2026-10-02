"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/client/tracking";

type CalFn = ((...args: unknown[]) => void) & { loaded?: boolean; ns?: Record<string, unknown>; q?: unknown[] };

/** Where a booking is confirmed and what happens next. Defaults to the Eligibility Review flow. */
type Target = {
  /** POST endpoint that records the booking */
  confirmPath?: string;
  /** Extra fields sent to confirmPath */
  extra?: Record<string, unknown>;
  /** Page to open after booking */
  redirectTo?: string;
};

async function confirm(token: string, data: Record<string, unknown>, target: Target = {}) {
  await fetch(target.confirmPath ?? "/api/booking/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...target.extra, ...data }),
  }).catch(() => {});
}

/**
 * Cal.com inline embed, prefilled and tagged with metadata so the webhook can match the booking —
 * the lead token for the Eligibility Review, or the programme stage id for programme sessions.
 */
export function CalBooking({
  token,
  name,
  email,
  calLink,
  calOrigin,
  metadata,
  confirmPath,
  extra,
  redirectTo,
}: { token: string; name: string; email: string; calLink: string; calOrigin: string; metadata?: Record<string, string> } & Target) {
  const router = useRouter();
  const done = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const w = window as unknown as { Cal?: CalFn };
    // Official Cal.com embed bootstrap
    (function (C: Window & { Cal?: CalFn }, A: string, L: string) {
      const p = (a: CalFn, ar: unknown) => { a.q!.push(ar); };
      const d = C.document;
      C.Cal = C.Cal || (function (...args: unknown[]) {
        const cal = C.Cal!;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const s = d.createElement("script");
          s.src = A;
          d.head.appendChild(s);
          cal.loaded = true;
        }
        if (args[0] === L) {
          const api = (function (...a: unknown[]) { p(api, a); }) as CalFn;
          const namespace = args[1] as string;
          api.q = api.q || [];
          if (typeof namespace === "string") { cal.ns![namespace] = cal.ns![namespace] || api; p(cal.ns![namespace] as CalFn, args); p(cal, ["initNamespace", namespace]); }
          else p(cal, args);
          return;
        }
        p(cal, args);
      } as CalFn);
    })(window as Window & { Cal?: CalFn }, `${calOrigin}/embed/embed.js`, "init");

    const Cal = w.Cal!;
    Cal("init", "gtl", { origin: calOrigin });
    const ns = (Cal.ns!.gtl as CalFn);
    ns("inline", {
      elementOrSelector: "#cal-inline",
      calLink,
      config: {
        name,
        email,
        ...Object.fromEntries(Object.entries(metadata ?? { leadToken: token }).map(([k, v]) => [`metadata[${k}]`, v])),
        layout: "month_view",
        theme: "light",
      },
    });
    ns("ui", { hideEventTypeDetails: false, layout: "month_view", cssVarsPerTheme: { light: { "cal-brand": "#0b1f3a" } } });
    const onBooked = (e: { detail?: { data?: Record<string, unknown> } }) => {
      if (done.current) return;
      done.current = true;
      const data = e.detail?.data ?? {};
      const booking = (data.booking as Record<string, unknown>) ?? data;
      track("calendar_booking_completed", {}, { internal: false });
      confirm(token, {
        uid: booking.uid,
        startTime: booking.startTime,
        endTime: booking.endTime,
        videoCallUrl: booking.videoCallUrl,
      }, { confirmPath, extra }).finally(() => router.push(redirectTo ?? `/book/${token}/confirmed`));
    };
    ns("on", { action: "bookingSuccessfulV2", callback: onBooked });
    ns("on", { action: "bookingSuccessful", callback: onBooked });
    ns("on", { action: "linkReady", callback: () => setLoaded(true) });
  }, [token, name, email, calLink, calOrigin, router]);

  return (
    <div style={{ position: "relative", minHeight: 620 }}>
      {!loaded && <p className="muted center" style={{ paddingTop: 40 }}>Loading available times…</p>}
      <div id="cal-inline" style={{ width: "100%", minHeight: 620, overflow: "auto" }} />
    </div>
  );
}

/** Local-development stand-in for Cal.com. */
export function MockBooking({ token, confirmPath, extra, redirectTo, minutes = 30 }: { token: string; minutes?: number } & Target) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const slots = [1, 2, 3].map((d) => {
    const t = new Date();
    t.setDate(t.getDate() + d);
    t.setHours(10 + d, 0, 0, 0);
    return t;
  });
  return (
    <div className="card">
      <div className="callout warn small" style={{ marginBottom: 16 }}>
        <strong>Development mock.</strong> Set <code>NEXT_PUBLIC_CAL_LINK</code> to show your real Cal.com calendar.
      </div>
      <div className="options">
        {slots.map((s) => (
          <button
            key={s.toISOString()}
            className="opt"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              track("calendar_booking_completed", {}, { internal: false });
              await confirm(token, { uid: `mock_${Date.now()}`, startTime: s.toISOString(), endTime: new Date(s.getTime() + minutes * 60000).toISOString(), mock: true }, { confirmPath, extra });
              router.push(redirectTo ?? `/book/${token}/confirmed`);
              router.refresh();
            }}
          >
            {s.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </button>
        ))}
      </div>
    </div>
  );
}
