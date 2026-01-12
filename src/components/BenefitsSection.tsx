import { motion } from "framer-motion";
import { useState } from "react";

const benefits = [
  {
    number: "01",
    title: "Discover instantly",
    description: "Search by interests, skills, or vibes. Find clubs and events that actually match you.",
  },
  {
    number: "02",
    title: "Find your people",
    description: "Meet founders, creatives, builders, and dreamers. The ambitious ones are all here.",
  },
  {
    number: "03",
    title: "Never miss events",
    description: "A clean feed of every on-campus event. From socials to hackathons to niche meetups.",
  },
  {
    number: "04",
    title: "Built for UCSD",
    description: "Designed by students who understand the problem first-hand. No generic solutions.",
  },
];

const BenefitsSection = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              Student Value
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold line-accent">
              More than an app
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                className={`group p-6 rounded-lg border transition-all duration-500 cursor-default ${
                  hoveredIndex === index
                    ? "bg-card border-gold/30 shadow-md"
                    : "bg-card/50 border-border"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className={`font-display text-2xl transition-colors duration-300 ${
                    hoveredIndex === index ? "text-gold" : "text-muted-foreground/30"
                  }`}>
                    {benefit.number}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-muted-foreground max-w-xl mx-auto">
              Unicircle makes UCSD feel alive. It helps you find people who match your ambition, 
              and makes campus finally have a{" "}
              <span className="text-gold">real social pulse</span>.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;