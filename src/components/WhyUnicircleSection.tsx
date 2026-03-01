import { motion } from "framer-motion";
import { Search, CalendarCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const WhyUnicircleSection = () => {
  const { playClick, playHover } = useSoundEffects();

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
            <AnimatedWords
              text="Find your people."
              as="h2"
              className="font-display text-3xl md:text-5xl font-semibold"
              goldWords={["people."]}
            />
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-4 p-8 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default text-center"
              onMouseEnter={playHover}
            >
              <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                <Search className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-display font-semibold text-foreground">
                Club directory
              </h3>
              <p className="text-sm text-muted-foreground">
                Every organization. One search.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex flex-col items-center gap-4 p-8 rounded-xl glass-card glass-card-hover transition-all duration-300 cursor-default text-center"
              onMouseEnter={playHover}
            >
              <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                <CalendarCheck className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-display font-semibold text-foreground">
                Event calendar
              </h3>
              <p className="text-sm text-muted-foreground">
                Every event. One view.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button
              variant="outline"
              size="lg"
              className="group"
              asChild
              onMouseEnter={playHover}
              onClick={playClick}
            >
              <Link to="/clubs">
                Browse directory
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
