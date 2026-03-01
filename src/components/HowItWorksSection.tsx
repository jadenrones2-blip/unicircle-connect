import { motion } from "framer-motion";
import { ClipboardCheck, Layers, Send } from "lucide-react";
import AnimatedWords from "./AnimatedWords";
import GoldMeshBackground from "./GoldMeshBackground";

const steps = [
  {
    icon: ClipboardCheck,
    number: "01",
    title: "Claim & configure",
    description: "Verify ownership of your organization. Define your recruitment stages, criteria, and evaluation workflow.",
  },
  {
    icon: Layers,
    number: "02",
    title: "Manage the pipeline",
    description: "Import applicants via CSV or direct intake. Move them through stages, score candidates, and collaborate with reviewers.",
  },
  {
    icon: Send,
    number: "03",
    title: "Communicate transparently",
    description: "Applicants receive automated updates as they progress. Decisions are delivered clearly — no ambiguity.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how" className="py-16 md:py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <GoldMeshBackground />
      <div className="container mx-auto px-5 sm:px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              Workflow
            </span>
            <AnimatedWords
              text="How it works"
              as="h2"
              className="font-display text-3xl md:text-4xl font-semibold text-primary-foreground"
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Animated connecting line */}
            <motion.div
              className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-px"
              style={{ background: "linear-gradient(90deg, transparent, hsl(43 76% 52% / 0.4), transparent)" }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
            />

            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="relative text-center"
              >
                <div className="relative z-10 w-14 h-14 mx-auto mb-6 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <step.icon className="w-6 h-6 text-gold" />
                </div>

                <div className="p-6 rounded-xl glass-card glass-card-hover transition-all duration-300">
                  <span className="text-gold/60 text-xs font-semibold tracking-[0.15em]">{step.number}</span>
                  <h3 className="font-display text-xl font-semibold mt-2 mb-3 text-primary-foreground">{step.title}</h3>
                  <p className="text-sm text-primary-foreground/60 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
