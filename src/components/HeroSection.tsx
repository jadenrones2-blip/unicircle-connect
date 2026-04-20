import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { getLenis } from "@/hooks/useLenis";

function clamp(v: number, a: number, b: number) {
  return Math.min(Math.max(v, a), b);
}
function mapRange(v: number, a: number, b: number, c: number, d: number) {
  return c + (d - c) * clamp((v - a) / (b - a), 0, 1);
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2); // quadratic — snappier than cubic
}
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const SCROLL_HEIGHT = "320vh";

const HeroSection = () => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const p = useMotionValue(0); // 0–1 progress through the 320vh range

  useEffect(() => {
    let rafId: number;
    let heroTop = 0;

    const measure = () => {
      const el = sentinelRef.current;
      if (el) heroTop = el.offsetTop;
    };

    measure();
    window.addEventListener("resize", measure);

    const loop = () => {
      const lenis = getLenis();
      // targetScroll is the raw un-lerped position — no lag
      const scrollY = lenis ? (lenis as any).targetScroll ?? lenis.scroll : window.scrollY;
      const el = sentinelRef.current;
      if (el) {
        const range = el.offsetHeight - window.innerHeight;
        p.set(clamp((scrollY - heroTop) / range, 0, 1));
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
    };
  }, [p]);

  // S1 — fades/scales out [tighter window]
  const s1Opacity = useTransform(p, (v) => 1 - easeOut(mapRange(v, 0.18, 0.42, 0, 1)));
  const s1Scale   = useTransform(p, (v) => 1 - 0.06 * easeOut(mapRange(v, 0.18, 0.42, 0, 1)));
  const s1Y       = useTransform(p, (v) => -easeOut(mapRange(v, 0.18, 0.42, 0, 1)) * 20);

  // Photo — fades in [tighter window]
  const photoOpacity = useTransform(p, (v) => easeInOut(mapRange(v, 0.15, 0.45, 0, 1)));
  const photoYPct    = useTransform(p, (v) => `${(1 - easeInOut(mapRange(v, 0.15, 0.45, 0, 1))) * 1.5}%`);

  // S2 — fades in [tighter window]
  const s2Opacity = useTransform(p, (v) => easeOut(mapRange(v, 0.38, 0.62, 0, 1)));
  const s2Y       = useTransform(p, (v) => (1 - easeOut(mapRange(v, 0.38, 0.62, 0, 1))) * 26);

  // Hide the fixed panel once we've scrolled past the hero range
  const panelOpacity = useTransform(p, [0.98, 1], [1, 0]);
  const panelPointer = useTransform(p, (v) => v >= 1 ? "none" : "auto");

  return (
    <>
      {/* Scroll spacer — 320vh of scroll range */}
      <div ref={sentinelRef} style={{ height: SCROLL_HEIGHT, position: "relative" }} />

      {/* Fixed viewport panel — avoids position:sticky / overflow:clip issues with Lenis */}
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "#000",
          opacity: panelOpacity,
          pointerEvents: panelPointer,
        }}
      >
        {/* ── Layer B — Crowd Photo ─────────────────────────── */}
        <motion.div className="absolute inset-0 z-10" style={{ opacity: photoOpacity }}>
          <motion.img
            className="w-full h-full object-cover"
            style={{ scale: 1.05, y: photoYPct, objectPosition: "center 38%" }}
            src="/crowd-park.png"
            alt=""
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,.05) 30%, rgba(0,0,0,.55) 65%, rgba(0,0,0,.92) 88%, #000 100%)",
            }}
          />
          <div className="absolute top-0 left-0 right-0" style={{ height: "30%", background: "linear-gradient(to bottom, #000, transparent)" }} />
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "35%", background: "linear-gradient(to top, #000, transparent)" }} />
        </motion.div>

        {/* ── Layer A — S1 Headline ─────────────────────────── */}
        <motion.div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
          style={{ opacity: s1Opacity, scale: s1Scale, y: s1Y }}
        >
          <div style={{ overflow: "hidden" }}>
            <motion.span
              className="block font-display font-black text-white"
              style={{ fontSize: "clamp(56px, 7vw, 100px)", letterSpacing: "-0.04em", lineHeight: 1 }}
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Find Your People.
            </motion.span>
          </div>
          <div style={{ overflow: "hidden" }}>
            <motion.span
              className="block font-display font-black text-white"
              style={{ fontSize: "clamp(56px, 7vw, 100px)", letterSpacing: "-0.04em", lineHeight: 1 }}
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              Build Your Team.
            </motion.span>
          </div>
          <motion.p
            className="mt-[22px] text-white/40 tracking-[0.03em]"
            style={{ fontSize: "15px" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            Club discovery and recruitment for UCSD.
          </motion.p>
        </motion.div>

        {/* ── Layer C — S2 Headline ─────────────────────────── */}
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
          style={{ opacity: s2Opacity, y: s2Y }}
        >
          <div
            className="inline-flex items-center gap-1.5 mb-7 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] border"
            style={{
              color: "hsl(47 95% 65%)",
              background: "hsl(47 95% 58% / 0.1)",
              borderColor: "hsl(47 95% 58% / 0.28)",
            }}
          >
            <span className="rounded-full" style={{ width: 5, height: 5, background: "hsl(47 95% 65%)", flexShrink: 0 }} />
            For Students · For Orgs
          </div>

          <h2
            className="font-display font-black text-white"
            style={{
              fontSize: "clamp(44px, 5.5vw, 78px)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              textShadow: "0 2px 32px rgba(0,0,0,.8), 0 0 80px rgba(0,0,0,.5)",
            }}
          >
            Finding your people<br />
            shouldn't be this hard.
          </h2>

          <p
            className="mt-5 text-white/50 tracking-[0.02em]"
            style={{ fontSize: 14, textShadow: "0 1px 12px rgba(0,0,0,.9)" }}
          >
            Free for students. Always.
          </p>
        </motion.div>
      </motion.div>
    </>
  );
};

export default HeroSection;
