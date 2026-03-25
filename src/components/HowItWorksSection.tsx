import { motion } from "framer-motion";
import AnimatedWords from "./AnimatedWords";

const steps = [
  { number: "01", title: "Set up",  desc: "Connect your club, build your application form, and configure your pipeline stages in minutes." },
  { number: "02", title: "Review",  desc: "Every submission lands in your board. Score applicants, coordinate with your team, and advance with one click." },
  { number: "03", title: "Decide",  desc: "Accept, reject, or request an interview. Applicants are notified automatically — no manual emails." },
];

const HowItWorksSection = () => {
  return (
    <section id="how" className="py-16 md:py-24 border-t border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-14">

        <div className="mb-10 md:mb-12">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[11px] font-semibold text-gold tracking-[0.25em] uppercase mb-8"
          >
            Workflow
          </motion.p>
          <AnimatedWords
            text="Three steps. That's it."
            as="h2"
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight text-white/70"
            goldWords={["it."]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border/20 border border-border/20 rounded-2xl overflow-hidden">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="bg-background px-8 py-10 sm:py-14"
            >
              <div className="font-display text-[4.5rem] sm:text-[5.5rem] font-bold leading-none text-foreground/[0.07] mb-6 select-none">
                {step.number}
              </div>
              <h3 className="font-display text-xl font-semibold text-white/70 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-white leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorksSection;
