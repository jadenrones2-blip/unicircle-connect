import { motion } from "framer-motion";
import { Users, ClipboardList, BarChart3, Unlink, EyeOff, Clock } from "lucide-react";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const challenges = [
  { icon: Users, title: "Volume overload" },
  { icon: ClipboardList, title: "Reviewer bottlenecks" },
  { icon: BarChart3, title: "Manual scoring" },
  { icon: Unlink, title: "Disconnected tools" },
  { icon: EyeOff, title: "Zero transparency" },
  { icon: Clock, title: "Wasted hours" },
];

const ProblemSection = () => {
  const { playHover } = useSoundEffects();

  return (
    <section id="problem" className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              The problem
            </span>
            <AnimatedWords
              text="Recruitment doesn't scale."
              as="h2"
              className="font-display text-3xl md:text-5xl font-semibold"
              goldWords={["scale."]}
            />
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                className="group flex flex-col items-center gap-3 p-5 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default text-center"
                onMouseEnter={playHover}
              >
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-gold/10 transition-colors duration-300">
                  <challenge.icon className="w-6 h-6 text-muted-foreground group-hover:text-gold transition-colors duration-300" />
                </div>
                <span className="text-xs font-semibold text-foreground tracking-wide">
                  {challenge.title}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
