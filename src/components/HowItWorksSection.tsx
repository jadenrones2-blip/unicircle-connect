import { motion } from "framer-motion";
import { Search, Zap, CircleDot } from "lucide-react";
import { useState } from "react";

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Browse",
    description: "See every club and event in one place. No hunting across platforms.",
  },
  {
    icon: Zap,
    number: "02",
    title: "Discover",
    description: "Find things you didn't know existed — communities, events, and people outside your bubble.",
  },
  {
    icon: CircleDot,
    number: "03",
    title: "Connect",
    description: "Take action. Join a club, attend an event, or reach out. Real connection, not passive scrolling.",
  },
];

const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <section id="how" className="py-12 md:py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              How It Works
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold">
              Built for action, not attention
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-gold/0 via-gold/30 to-gold/0" />

            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                onHoverStart={() => setActiveStep(index)}
                onHoverEnd={() => setActiveStep(null)}
                className="relative text-center group"
              >
                {/* Step circle */}
                <motion.div 
                  className={`relative z-10 w-12 h-12 mx-auto mb-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    activeStep === index
                      ? "border-gold bg-gold/10"
                      : "border-primary-foreground/20 bg-primary"
                  }`}
                  animate={activeStep === index ? { scale: 1.1 } : { scale: 1 }}
                >
                  <step.icon className={`w-5 h-5 transition-colors duration-300 ${
                    activeStep === index ? "text-gold" : "text-primary-foreground/70"
                  }`} />
                </motion.div>

                <div className={`p-6 rounded-lg border transition-all duration-300 ${
                  activeStep === index
                    ? "bg-primary-foreground/5 border-gold/30"
                    : "bg-primary-foreground/5 border-primary-foreground/10"
                }`}>
                  <span className="text-gold/60 text-xs font-medium">{step.number}</span>
                  <h3 className="font-display text-xl font-semibold mt-2 mb-3">{step.title}</h3>
                  <p className="text-sm text-primary-foreground/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-10 text-center"
          >
            <p className="text-primary-foreground/80 font-display text-lg">
              No complicated signups.{" "}
              <span className="text-gold">Just start exploring.</span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;