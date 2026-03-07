import { motion } from "framer-motion";
import AnimatedWords from "./AnimatedWords";

const challenges = [
  { number: "01", title: "Volume overload",       detail: "Hundreds of applicants, no system to handle them." },
  { number: "02", title: "Reviewer bottlenecks",  detail: "Multiple reviewers, zero coordination." },
  { number: "03", title: "Manual scoring",         detail: "Spreadsheets can't scale. Period." },
  { number: "04", title: "Disconnected tools",     detail: "Forms, sheets, emails — all fragmented." },
  { number: "05", title: "Zero transparency",      detail: "Applicants never know where they stand." },
  { number: "06", title: "Wasted hours",           detail: "Status updates and follow-ups eat your week." },
];

const ProblemSection = () => {
  return (
    <section id="problem" className="py-24 md:py-36 border-t border-border/20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28">

          {/* Left: editorial headline */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[11px] font-semibold text-gold tracking-[0.25em] uppercase mb-8"
            >
              The problem
            </motion.p>
            <AnimatedWords
              text="Recruitment doesn't scale."
              as="h2"
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight mb-6"
              goldWords={["scale."]}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-foreground/40 text-base leading-relaxed max-w-xs"
            >
              Every serious club hits the same wall. The tools aren't built for this.
            </motion.p>
          </div>

          {/* Right: numbered list */}
          <div className="divide-y divide-border/20">
            {challenges.map((c, i) => (
              <motion.div
                key={c.number}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="flex items-start gap-6 py-6"
              >
                <span className="text-[11px] font-semibold text-foreground/20 tracking-widest mt-0.5 flex-shrink-0 w-6">
                  {c.number}
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground mb-1">{c.title}</div>
                  <div className="text-sm text-foreground/40">{c.detail}</div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
