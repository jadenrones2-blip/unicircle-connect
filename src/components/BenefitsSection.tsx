import { motion } from "framer-motion";
import AnimatedWords from "./AnimatedWords";

const benefits = [
  { number: "01", title: "Track status",   desc: "See exactly where you stand in the process, in real time." },
  { number: "02", title: "Get updates",    desc: "Notified the moment you advance or receive a decision." },
  { number: "03", title: "Discover clubs", desc: "Find every org on campus that matches your interests." },
];

const BenefitsSection = () => {
  return (
    <section className="py-24 md:py-36 border-t border-border/20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-14">

        <div className="mb-16 md:mb-20">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[11px] font-semibold text-gold tracking-[0.25em] uppercase mb-8"
          >
            For applicants
          </motion.p>
          <AnimatedWords
            text="Full transparency. Always."
            as="h2"
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight"
            goldWords={["transparency."]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border/20 border border-border/20 rounded-2xl overflow-hidden">
          {benefits.map((b, i) => (
            <motion.div
              key={b.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-background px-8 py-10 sm:py-14"
            >
              <div className="font-display text-[4.5rem] sm:text-[5.5rem] font-bold leading-none text-foreground/[0.07] mb-6 select-none">
                {b.number}
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-foreground/40 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default BenefitsSection;
