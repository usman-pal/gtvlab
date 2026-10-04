"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site-config";

/** Mobile-only bottom CTA that appears once the hero CTA has scrolled out of view
 *  (hidden again over the pathway selector and the final CTA, which carry their own CTAs). */
export default function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const final = document.getElementById("final-cta");
    const paths = document.getElementById("path");
    if (!hero) return;
    let heroVisible = true;
    let finalVisible = false;
    let pathsVisible = false;
    const update = () => setShow(!heroVisible && !finalVisible && !pathsVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === final) finalVisible = e.isIntersecting;
        if (e.target === paths) pathsVisible = e.isIntersecting;
      }
      update();
    });
    io.observe(hero);
    if (final) io.observe(final);
    if (paths) io.observe(paths);
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
