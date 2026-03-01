import { motion } from "framer-motion";
import { Users, ClipboardList, BarChart3, Unlink, EyeOff, Clock } from "lucide-react";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const challenges = [
  {
    icon: Users,
    title: "Hundreds of applicants",
    detail: "Volume increases every cycle, and manual processes don't keep up.",
  },
  {
    icon: ClipboardList,
    title: "Multiple reviewers",
    detail: "Coordinating evaluation across team members creates bottlenecks.",
  },
  {
    icon: BarChart3,
    title: "Manual scoring",
    detail: "Spreadsheet-based evaluation is slow, inconsistent, and hard to audit.",
  },
  {
    icon: Unlink,
    title: "Disconnected tools",
    detail: "Data lives across forms, sheets, emails, and group chats — fragmented by default.",
  },
  {
    icon: EyeOff,
    title: "Limited transparency",
    detail: "Applicants have no visibility into where they stand. Clubs lack a clear overview.",
  },
  {
    icon: Clock,
    title: "Time-consuming coordination",
    detail: "Scheduling, status updates, and communication take hours every week.",
  },
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
              The challenge
            </span>
            <AnimatedWords
              text="Recruitment becomes complex at scale."
              as="h2"
              className="font-display text-3xl md:text-4xl font-semibold mb-4"
              goldWords={["complex"]}
            />
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-light">
              As organizations grow, the operational demands of recruitment increase significantly.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className="group p-5 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default"
                onMouseEnter={playHover}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-gold/10 transition-colors duration-300">
                    <challenge.icon className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground mb-1">
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {challenge.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
