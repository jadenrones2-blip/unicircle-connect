import { motion } from "framer-motion";
import { FileText, GripVertical, BarChart3, ShieldCheck, GitBranch, Bell } from "lucide-react";
import { PipelinePreview } from "./PipelinePreview";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const capabilities = [
  { icon: FileText, title: "Application intake", desc: "Structured forms with resume parsing." },
  { icon: GripVertical, title: "Drag-and-drop pipeline", desc: "Visual kanban for every stage." },
  { icon: BarChart3, title: "Structured scoring", desc: "Consistent evaluation across reviewers." },
  { icon: ShieldCheck, title: "Reviewer permissions", desc: "Control who sees and decides what." },
  { icon: GitBranch, title: "Stage tracking", desc: "Track every applicant's position." },
  { icon: Bell, title: "Auto notifications", desc: "Applicants get updates automatically." },
];

const SolutionSection = () => {
  const { playHover } = useSoundEffects();

  return (
    <section className="py-16 md:py-24 bg-secondary/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              The system
            </span>
            <AnimatedWords
              text="Everything you need. Nothing you don't."
              as="h2"
              className="font-display text-3xl md:text-5xl font-semibold"
              goldWords={["need."]}
            />
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {capabilities.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                className="flex items-start gap-4 p-5 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default"
                onMouseEnter={playHover}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-0.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <PipelinePreview />
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
