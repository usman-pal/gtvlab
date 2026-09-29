"use client";
import { useEffect, useState } from "react";

/** Renders a date in the viewer's timezone (server renders the booking timezone first). */
export default function LocalTime({ iso, fallbackTz }: { iso: string; fallbackTz: string }) {
  const fmt = (tz: string) =>
    `${new Date(iso).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: tz })} (${tz.replace(/_/g, " ")})`;
  const [text, setText] = useState(() => fmt(fallbackTz));
  useEffect(() => {
    setText(fmt(Intl.DateTimeFormat().resolvedOptions().timeZone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);
  return <span suppressHydrationWarning>{text}</span>;
}
