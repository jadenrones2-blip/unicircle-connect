import { motion } from "framer-motion";
import { Search, CalendarCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const WhyUnicircleSection = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/50">
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
              Discovery
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Structured discovery for students and organizations.
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-light">
              A structured layer that connects students to the right organizations and events — intentionally.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex gap-4 p-6 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-1">
                  Searchable directory
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every student organization in one place — searchable by category, interest, and activity. No fragmented sources.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex gap-4 p-6 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-1">
                  Centralized event calendar
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A single view of campus events — sourced, moderated, and organized. No missed opportunities.
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button variant="outline" size="lg" className="group" asChild>
              <Link to="/clubs">
                Browse the directory
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyUnicircleSection;