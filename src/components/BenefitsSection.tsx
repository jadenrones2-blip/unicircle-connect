import { motion } from "framer-motion";
import { Eye, Bell, Compass } from "lucide-react";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const benefits = [
  { icon: Eye, title: "Track status", desc: "See where you stand in real time." },
  { icon: Bell, title: "Get updates", desc: "Notified when you advance or get a decision." },
  { icon: Compass, title: "Discover clubs", desc: "Find orgs that match your interests." },
];

const BenefitsSection = () => {
  const { playHover } = useSoundEffects();

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              For applicants
            </span>
            <AnimatedWords
              text="Full transparency. Always."
              as="h2"
              className="font-display text-3xl md:text-5xl font-semibold"
              goldWords={["transparency."]}
            />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="flex flex-col items-center gap-3 p-8 rounded-xl glass-card glass-card-hover transition-all duration-300 text-center cursor-default"
                onMouseEnter={playHover}
              >
                <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <benefit.icon className="w-7 h-7 text-gold" />
                </div>
                <h3 className="font-display font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
