import { motion } from "framer-motion";
import { Search, CalendarCheck, Sparkles, Users } from "lucide-react";

const reasons = [
  {
    icon: Search,
    title: "One source of truth",
    description: "Every club and event, in one place. No more piecing together information from scattered sources.",
  },
  {
    icon: CalendarCheck,
    title: "Stay in the loop effortlessly",
    description: "See what's happening this week without checking ten different accounts.",
  },
  {
    icon: Users,
    title: "Made by students, for students",
    description: "We built this because we needed it ourselves. We know what's broken.",
  },
  {
    icon: Sparkles,
    title: "Designed for discovery",
    description: "Not another feed to scroll. A tool to help you find where you belong.",
  },
];

const WhyUnicircleSection = () => {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Why UniCircle?
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Because finding your people should feel natural — not like a scavenger hunt.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {reasons.map((reason, index) => (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="flex gap-4 p-5 rounded-lg bg-card border border-border hover:border-gold/30 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                  <reason.icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    {reason.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUnicircleSection;
