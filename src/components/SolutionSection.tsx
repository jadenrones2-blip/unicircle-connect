import { motion } from "framer-motion";
import { FileText, GripVertical, BarChart3, ShieldCheck, GitBranch, Bell } from "lucide-react";
import { PipelinePreview } from "./PipelinePreview";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const capabilities = [
  { icon: FileText, title: "Application intake" },
  { icon: GripVertical, title: "Drag-and-drop pipeline" },
  { icon: BarChart3, title: "Structured scoring" },
  { icon: ShieldCheck, title: "Reviewer permissions" },
  { icon: GitBranch, title: "Stage tracking" },
  { icon: Bell, title: "Auto notifications" },
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {capabilities.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                className="flex flex-col items-center gap-3 p-5 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default text-center"
                onMouseEnter={playHover}
              >
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-gold" />
                </div>
                <span className="text-xs font-semibold text-foreground tracking-wide">
                  {item.title}
                </span>
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
