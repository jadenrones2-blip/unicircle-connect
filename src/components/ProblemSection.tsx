import { motion } from "framer-motion";
import AnimatedWords from "./AnimatedWords";

const challenges = [
  { number: "01", title: "Three tools, one job",       detail: "Google Forms for intake. A spreadsheet for tracking. Instagram DMs for updates. None of them talk to each other." },
  { number: "02", title: "Reviewer chaos",              detail: "Multiple officers editing different spreadsheet versions with no coordination or shared view." },
  { number: "03", title: "Applicants left guessing",    detail: "Students email asking for status because there's no system. Answering them is now your job." },
  { number: "04", title: "It breaks at scale",          detail: "50 applicants is manageable. 150 is chaos. The workflow doesn't scale and you feel it every cycle." },
];

const ProblemSection = () => {
  return (
    <section id="problem" className="py-16 md:py-24 border-t border-white/[0.07]">
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
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight mb-6 text-white/70"
              goldWords={["scale."]}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white text-base leading-relaxed max-w-xs"
            >
              Clubs run recruitment on Google Forms, spreadsheets, and Instagram DMs. It's fragmented, manual, and breaks under pressure.
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
                className="flex items-start gap-6 py-4"
              >
                <span className="text-[11px] font-semibold text-white/40 tracking-widest mt-0.5 flex-shrink-0 w-6">
                  {c.number}
                </span>
                <div>
                  <div className="text-sm font-semibold text-white/70 mb-1">{c.title}</div>
                  <div className="text-sm text-white">{c.detail}</div>
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
