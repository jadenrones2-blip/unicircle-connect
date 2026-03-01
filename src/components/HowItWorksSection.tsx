import { motion } from "framer-motion";
import { ClipboardCheck, Layers, Send } from "lucide-react";
import AnimatedWords from "./AnimatedWords";
import GoldMeshBackground from "./GoldMeshBackground";

const steps = [
  { icon: ClipboardCheck, number: "01", title: "Claim", desc: "Verify your org and configure stages." },
  { icon: Layers, number: "02", title: "Manage", desc: "Import applicants. Score and advance." },
  { icon: Send, number: "03", title: "Communicate", desc: "Automated updates. Clear decisions." },
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
            className="text-center mb-16"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              Workflow
            </span>
            <AnimatedWords
              text="Three steps. That's it."
              as="h2"
              className="font-display text-3xl md:text-5xl font-semibold text-primary-foreground"
              goldWords={["it."]}
            />
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Animated connecting line */}
            <motion.div
              className="hidden sm:block absolute top-[3.5rem] left-[16.5%] right-[16.5%] h-px"
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
                <div className="relative z-10 w-16 h-16 mx-auto mb-5 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-gold" />
                </div>

                <span className="text-gold/50 text-xs font-semibold tracking-[0.15em] block mb-1">{step.number}</span>
                <h3 className="font-display text-xl font-semibold text-primary-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-primary-foreground/50">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
