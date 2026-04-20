import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // S1 — fades/scales out as user scrolls
  const s1Opacity = useTransform(scrollYProgress, [0.25, 0.55], [1, 0]);
  const s1Scale   = useTransform(scrollYProgress, [0.25, 0.55], [1, 0.94]);
  const s1Y       = useTransform(scrollYProgress, [0.25, 0.55], [0, -20]);

  // Photo layer — fades in from 0.2 → 0.6
  const photoOpacity = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);
  const photoY       = useTransform(scrollYProgress, [0.2, 0.6], ["1.5%", "0%"]);

  // S2 — fades in from 0.45 → 0.82
  const s2Opacity = useTransform(scrollYProgress, [0.45, 0.82], [0, 1]);
  const s2Y       = useTransform(scrollYProgress, [0.45, 0.82], [26, 0]);

  return (
    <div ref={containerRef} style={{ height: "320vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-black">

        {/* ── Layer B — Video / Photo ────────────────────────── */}
        <motion.div
          className="absolute inset-0 z-10"
          style={{ opacity: photoOpacity }}
        >
          <motion.video
            className="w-full h-full object-cover"
            style={{ scale: 1.05, y: photoY }}
            src="/hero-bg.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          {/* Radial vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,.05) 30%, rgba(0,0,0,.55) 65%, rgba(0,0,0,.92) 88%, #000 100%)",
            }}
          />
          {/* Top fade */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: "30%",
              background: "linear-gradient(to bottom, #000 0%, transparent 100%)",
            }}
          />
          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: "35%",
              background: "linear-gradient(to top, #000 0%, transparent 100%)",
            }}
          />
        </motion.div>

        {/* ── Layer A — S1 Headline ─────────────────────────── */}
        <motion.div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
          style={{ opacity: s1Opacity, scale: s1Scale, y: s1Y }}
        >
          <div style={{ overflow: "hidden" }}>
            <motion.span
              className="block font-display font-black text-white"
              style={{
                fontSize: "clamp(56px, 7vw, 100px)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
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
              style={{
                fontSize: "clamp(56px, 7vw, 100px)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
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
          {/* Chip */}
          <div
            className="inline-flex items-center gap-1.5 mb-7 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] border"
            style={{
              color: "hsl(47 95% 65%)",
              background: "hsl(47 95% 58% / 0.1)",
              borderColor: "hsl(47 95% 58% / 0.28)",
            }}
          >
            <span
              className="rounded-full"
              style={{ width: 5, height: 5, background: "hsl(47 95% 65%)", flexShrink: 0 }}
            />
            For Students · For Orgs
          </div>

          {/* Headline */}
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

      </div>
    </div>
  );
};

export default HeroSection;
