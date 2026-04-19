import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import TiltCard from "./TiltCard";

const features = [
  {
    label: "For Students",
    headline: "600+ clubs. One place to find them.",
    body: "No more digging through dead Instagram pages or Google Forms from two quarters ago. See every club recruiting right now.",
  },
  {
    label: "For Orgs",
    headline: "Run recruitment like a real pipeline.",
    body: "Google Forms and group chats aren't a system. UniCircle gives your officers a structured process — every stage, every applicant, every decision in one place.",
  },
];

const ProblemSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={ref} className="py-32 md:py-48 border-t border-white/[0.07] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">

        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs tracking-[0.25em] uppercase text-[#F5C842] font-semibold mb-6"
        >
          The problem
        </motion.p>

        {/* Big statement */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.0] tracking-tight mb-24 max-w-3xl"
        >
          Finding your people<br />
          <span className="text-white/30">shouldn't be this hard.</span>
        </motion.h2>

        {/* Feature cards with tilt */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <TiltCard className="group h-full">
                <div className="p-8 md:p-10 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors duration-500 h-full">
                  <p className="text-xs tracking-[0.2em] uppercase text-[#F5C842]/70 font-semibold mb-6">{f.label}</p>
                  <h3 className="font-display font-black text-2xl md:text-3xl text-white leading-tight mb-4">
                    {f.headline}
                  </h3>
                  <p className="text-zinc-500 text-base leading-relaxed">{f.body}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Parallax stat line */}
        <motion.div
          style={{ y }}
          className="mt-24 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07] border border-white/[0.07] rounded-2xl overflow-hidden"
        >
          {[
            { num: "10,000+", label: "Total Organizations", sub: "Across the UC ecosystem", projected: false },
            { num: "Multi-Campus", label: "Infrastructure", sub: "Currently deploying system-wide", projected: false },
            { num: "500,000+", label: "Hours Projected Recovery", sub: "Annual admin efficiency potential", projected: true },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="px-8 py-10 flex flex-col gap-2"
            >
              <div className="font-display font-black text-3xl md:text-4xl text-white tracking-tight leading-none">
                {s.num}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-zinc-300 text-sm font-medium">{s.label}</div>
                {s.projected && (
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#F5C842]/60 font-semibold border border-[#F5C842]/20 px-1.5 py-0.5 rounded">
                    Projected
                  </span>
                )}
              </div>
              <div className="text-zinc-600 text-xs">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default ProblemSection;
