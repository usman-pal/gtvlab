"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site-config";

/** Mobile-only bottom CTA that appears once the hero CTA has scrolled out of view. */
export default function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const final = document.getElementById("final-cta");
    if (!hero) return;
    let heroVisible = true;
    let finalVisible = false;
    const update = () => setShow(!heroVisible && !finalVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === final) finalVisible = e.isIntersecting;
      }
      update();
    });
    io.observe(hero);
    if (final) io.observe(final);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`sticky-cta${show ? " show" : ""}`} aria-hidden={!show}>
      <Link href={site.primaryCtaHref} className="btn btn-primary btn-block" tabIndex={show ? 0 : -1}>
        {site.primaryCta}
      </Link>
      <div className="xs">Free · about 3 minutes</div>
    </div>
  );
}
