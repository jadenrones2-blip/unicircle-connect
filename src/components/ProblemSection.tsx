import { motion } from "framer-motion";

const studentProblems = [
  { text: "UCSD has 600+ clubs. You've heard of maybe 10." },
  { text: "Figuring out who's even recruiting means digging through dead Instagram pages and Google Forms from two quarters ago." },
  { text: "The clubs full of people who'd actually push you — you don't know they exist." },
];

const orgProblems = [
  { text: "Google Form drops into a spreadsheet. Decisions happen in a group chat. Nothing talks to anything." },
  { text: "Deliberations run until 2am — not because the decisions are hard, but because the spreadsheet is." },
  { text: "Matching 300 applicant names to Venmo transactions by hand. Every quarter. Starting from scratch." },
];

const ProblemSection = () => {
  return (
    <section className="py-20 md:py-32 border-t border-white/[0.07]">
      <div className="max-w-5xl mx-auto px-6">

        {/* Section label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs tracking-[0.25em] uppercase text-[#F5C842] font-semibold mb-16"
        >
          The problem — both sides
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

          {/* Student side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-semibold mb-6">For students</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-[1.1] tracking-tight mb-8">
              The community you want<br />
              <span className="text-[#F5C842]">is out there. You just can't find it.</span>
            </h2>
            <div className="space-y-5">
              {studentProblems.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-1 h-1 rounded-full bg-[#F5C842] mt-2.5 flex-shrink-0" />
                  <p className="text-zinc-400 text-base leading-relaxed">{p.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Org side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-semibold mb-6">For orgs</div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-[1.1] tracking-tight mb-8">
              Recruitment has always<br />
              <span className="text-[#F5C842]">been run on spreadsheets and prayer.</span>
            </h2>
            <div className="space-y-5">
              {orgProblems.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-1 h-1 rounded-full bg-[#F5C842] mt-2.5 flex-shrink-0" />
                  <p className="text-zinc-400 text-base leading-relaxed">{p.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Divider quote */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-20 border-t border-white/[0.06] pt-16"
        >
          <p className="font-display text-2xl sm:text-3xl font-bold text-white/80 max-w-2xl leading-snug">
            "The most important thing about college isn't the GPA.{" "}
            <span className="text-[#F5C842]">It's who you're surrounded by."</span>
          </p>
          <p className="text-zinc-600 text-sm mt-4">— Jaden Rones, Founder · UCSD transfer student</p>
        </motion.div>

      </div>
    </section>
  );
};

export default ProblemSection;
