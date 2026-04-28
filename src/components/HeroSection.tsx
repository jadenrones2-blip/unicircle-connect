import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <>
      {/* ── Section 1 — Black hero ───────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-black">
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
          className="mt-6 tracking-[0.03em]"
          style={{ fontSize: 15, color: "rgba(255,255,255,0.4)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
        >
          Club discovery and recruitment for UCSD.
        </motion.p>

        {/* CTAs — visible immediately, no scrolling required */}
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3 mt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to="/clubs"
            className="font-bold text-black"
            style={{
              fontSize: 15,
              padding: "14px 36px",
              borderRadius: 9999,
              background: "hsl(47 95% 58%)",
              boxShadow: "0 6px 28px hsl(47 95% 58% / 0.35)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Explore Clubs →
          </Link>
          <Link
            to="/signup"
            style={{
              fontSize: 14,
              fontWeight: 600,
              padding: "14px 32px",
              borderRadius: 9999,
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.15)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Sign up free
          </Link>
        </motion.div>
      </section>

      {/* ── Section 2 — Photo + S2 headline ─────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0 z-0">
          <img
            src="/crowd-park.png"
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: "center 38%" }}
          />
          {/* Radial vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,.05) 30%, rgba(0,0,0,.55) 65%, rgba(0,0,0,.92) 88%, #000 100%)",
            }}
          />
          {/* Top fade — blends into black section above */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: "30%", background: "linear-gradient(to bottom, #000, transparent)" }}
          />
          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: "35%", background: "linear-gradient(to top, #000, transparent)" }}
          />
        </div>

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Gold chip */}
          <div
            className="inline-flex items-center gap-1.5 mb-7 rounded-full border"
            style={{
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "hsl(47 95% 65%)",
              background: "hsl(47 95% 58% / 0.1)",
              borderColor: "hsl(47 95% 58% / 0.28)",
            }}
          >
            <span
              className="rounded-full"
              style={{ width: 5, height: 5, flexShrink: 0, background: "hsl(47 95% 65%)" }}
            />
            For Students · For Orgs
          </div>

          {/* Headline */}
          <h2
            className="font-display font-black"
            style={{
              fontSize: "clamp(44px, 5.5vw, 78px)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#ffffff",
              textShadow: "0 2px 32px rgba(0,0,0,.8), 0 0 80px rgba(0,0,0,.5)",
            }}
          >
            Finding your people<br />
            shouldn't be this hard.
          </h2>

          {/* Subtitle */}
          <p
            className="mt-5 tracking-[0.02em]"
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              textShadow: "0 1px 12px rgba(0,0,0,.9)",
            }}
          >
            Free for students. Always.
          </p>
        </motion.div>
      </section>
    </>
  );
};

export default HeroSection;
