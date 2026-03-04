import { motion } from "framer-motion";
import { Users, ClipboardList, BarChart3, Unlink, EyeOff, Clock } from "lucide-react";
import AnimatedWords from "./AnimatedWords";
import ScrollHeadline from "./ScrollHeadline";
import TiltCard from "./TiltCard";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const challenges = [
  { icon: Users, title: "Volume overload", detail: "Hundreds of applicants, no system to handle them." },
  { icon: ClipboardList, title: "Reviewer bottlenecks", detail: "Multiple reviewers, zero coordination." },
  { icon: BarChart3, title: "Manual scoring", detail: "Spreadsheets can't scale. Period." },
  { icon: Unlink, title: "Disconnected tools", detail: "Forms, sheets, emails — all fragmented." },
  { icon: EyeOff, title: "Zero transparency", detail: "Applicants never know where they stand." },
  { icon: Clock, title: "Wasted hours", detail: "Status updates and follow-ups eat your week." },
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
            <ScrollHeadline
              text="Recruitment doesn't scale."
              className="font-display text-3xl md:text-5xl font-semibold justify-center"
            />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
              >
                <TiltCard className="group flex items-start gap-4 p-5 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default h-full" >
                  <div className="flex items-start gap-4 w-full" onMouseEnter={playHover}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-gold/10 transition-colors duration-300">
                      <challenge.icon className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-0.5">{challenge.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{challenge.detail}</p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
