import { motion } from "framer-motion";
import { Eye, Bell, Compass } from "lucide-react";

const benefits = [
  {
    icon: Eye,
    title: "Track your application status",
    description: "See exactly where you stand in the recruitment process for every organization you've applied to.",
  },
  {
    icon: Bell,
    title: "Receive stage updates",
    description: "Get notified when you advance to the next stage or receive a decision — automatically.",
  },
  {
    icon: Compass,
    title: "Discover aligned organizations",
    description: "Find organizations that match your interests, goals, and experience — intentionally, not randomly.",
  },
];

const BenefitsSection = () => {
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
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Clear and transparent for applicants.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-light">
              Applicants deserve visibility into the process.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="p-6 rounded-xl border border-border bg-card hover:border-gold/30 transition-colors duration-300 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;