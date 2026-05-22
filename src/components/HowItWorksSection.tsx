import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const steps = [
  {
    num: '01',
    side: 'Students',
    title: "Browse what's open.",
    body: 'See every club recruiting right now — filter by category, match score, or vibe.',
  },
  {
    num: '02',
    side: 'Students',
    title: 'Apply in one place.',
    body: "Fill out the club's form, upload your resume, done. No Venmo, no group chats.",
  },
  {
    num: '03',
    side: 'Orgs',
    title: 'Score together.',
    body: 'Every officer reviews on the same rubric. Decisions are structured, not vibes in a group chat.',
  },
  {
    num: '04',
    side: 'Orgs',
    title: 'Decide and notify.',
    body: "Accept or pass. Applicants get emailed automatically — you don't write a thing.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-32 md:py-48 border-t border-white/[0.07]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs tracking-[0.25em] uppercase text-[#F5C842] font-semibold mb-6">
              How it works
            </p>
            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl text-white leading-[1.0] tracking-tight max-w-sm">
              Simple on
              <br />
              both sides.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex gap-6"
          >
            <Link
              to="/clubs"
              className="inline-flex items-center gap-2 text-[#F5C842] text-sm font-semibold hover:gap-3 transition-all"
            >
              Browse clubs <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/club-admin/request"
              className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm font-semibold hover:gap-3 transition-all"
            >
              Get your org set up <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group flex items-start gap-8 md:gap-16 py-10 border-b border-white/[0.06] hover:border-white/[0.12] transition-colors duration-500 cursor-default"
            >
              {/* Number */}
              <div className="font-display font-black text-5xl md:text-7xl text-white group-hover:text-[#F5C842] transition-colors duration-500 leading-none flex-shrink-0 w-16 md:w-24 pt-1">
                {s.num}
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 md:gap-16">
                <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-600 font-semibold md:w-20 flex-shrink-0">
                  {s.side}
                </span>
                <h3 className="font-display font-black text-2xl md:text-3xl text-white leading-tight flex-1">
                  {s.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed md:max-w-xs">{s.body}</p>
              </div>

              {/* Arrow on hover */}
              <ArrowRight className="w-5 h-5 text-white/0 group-hover:text-[#F5C842] transition-colors duration-300 flex-shrink-0 mt-2" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
