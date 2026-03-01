import { motion } from "framer-motion";
import { FileText, GripVertical, BarChart3, ShieldCheck, GitBranch, Bell } from "lucide-react";
import { PipelinePreview } from "./PipelinePreview";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const capabilities = [
  {
    icon: FileText,
    title: "Application intake with resume upload",
    description: "Structured forms that capture the data you need. Resumes are parsed automatically.",
  },
  {
    icon: GripVertical,
    title: "Drag-and-drop applicant pipeline",
    description: "Move applicants through customizable stages with a visual kanban workflow.",
  },
  {
    icon: BarChart3,
    title: "Structured scoring and evaluation",
    description: "Consistent evaluation criteria across reviewers. AI-assisted screening available.",
  },
  {
    icon: ShieldCheck,
    title: "Reviewer permissions",
    description: "Control who can view, evaluate, and advance applicants at each stage.",
  },
  {
    icon: GitBranch,
    title: "Stage-based applicant tracking",
    description: "Define your recruitment stages. Track every applicant's position in the pipeline.",
  },
  {
    icon: Bell,
    title: "Clear communication and updates",
    description: "Automated email notifications when applicants advance. No manual follow-ups.",
  },
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
              text="Built for structured recruitment."
              as="h2"
              className="font-display text-3xl md:text-4xl font-semibold mb-4"
              goldWords={["structured"]}
            />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-light">
              A complete operational layer for managing recruitment cycles — from intake to decision.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className="p-6 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default"
                onMouseEnter={playHover}
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2 text-sm">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
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
