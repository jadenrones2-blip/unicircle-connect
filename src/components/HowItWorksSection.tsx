import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const studentSteps = [
  { step: "1", title: "Browse what's open", desc: "See every club recruiting right now — not last quarter's Google Form." },
  { step: "2", title: "Apply in one place", desc: "Fill out the club's form, submit your resume, and you're done." },
  { step: "3", title: "Track your status", desc: "See exactly where you stand. No more wondering, no more cold emails." },
];

const orgSteps = [
  { step: "1", title: "Set up your pipeline", desc: "Build your form, set your stages, invite your officers. Ten minutes." },
  { step: "2", title: "Score together", desc: "Every officer reviews on the same rubric. No more inconsistent spreadsheets." },
  { step: "3", title: "Decide and notify", desc: "Accept or pass. Applicants get emailed automatically. You don't write a thing." },
];

const HowItWorksSection = () => {
  return (
    <section className="py-20 md:py-32 border-t border-white/[0.07]">
      <div className="max-w-5xl mx-auto px-6">

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs tracking-[0.25em] uppercase text-[#F5C842] font-semibold mb-16"
        >
          How it works
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* Students */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <div className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-semibold mb-3">For students</div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                Stop guessing.<br />Start applying.
              </h2>
            </motion.div>

            <div className="space-y-8">
              {studentSteps.map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-5"
                >
                  <div className="text-[#F5C842] font-display font-bold text-4xl leading-none opacity-30 flex-shrink-0 w-8">
                    {s.step}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">{s.title}</div>
                    <div className="text-zinc-500 text-sm leading-relaxed">{s.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-10"
            >
              <Link
                to="/clubs"
                className="inline-flex items-center gap-2 text-[#F5C842] text-sm font-semibold hover:gap-3 transition-all"
              >
                Browse clubs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Orgs */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <div className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-semibold mb-3">For orgs</div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                Run recruitment<br />like it's not 2014.
              </h2>
            </motion.div>

            <div className="space-y-8">
              {orgSteps.map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-5"
                >
                  <div className="text-[#F5C842] font-display font-bold text-4xl leading-none opacity-30 flex-shrink-0 w-8">
                    {s.step}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">{s.title}</div>
                    <div className="text-zinc-500 text-sm leading-relaxed">{s.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-10"
            >
              <Link
                to="/club-admin/request"
                className="inline-flex items-center gap-2 text-[#F5C842] text-sm font-semibold hover:gap-3 transition-all"
              >
                Get your org set up
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
