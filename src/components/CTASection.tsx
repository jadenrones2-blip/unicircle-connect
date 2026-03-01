import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedWords from "./AnimatedWords";
import GoldMeshBackground from "./GoldMeshBackground";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const CTASection = () => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <section id="cta" className="scroll-mt-24 py-16 md:py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <GoldMeshBackground />

      <div className="container mx-auto px-5 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <AnimatedWords
            text="Your recruitment workflow, structured."
            as="h2"
            className="font-display text-2xl sm:text-3xl md:text-5xl font-semibold mb-4 sm:mb-6 leading-tight text-primary-foreground"
            goldWords={["structured."]}
          />

          <motion.p
            className="text-primary-foreground/60 text-base sm:text-lg mb-8 font-light px-2 sm:px-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            Claim your organization and set up your recruitment pipeline in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="glass-card inline-flex flex-col sm:flex-row gap-3 justify-center p-6 rounded-2xl"
          >
            <Button
              variant="gold"
              size="lg"
              className="group"
              asChild
              onMouseEnter={playHover}
              onClick={playClick}
            >
              <Link to="/clubs">
                Claim your club
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
              onMouseEnter={playHover}
              onClick={playClick}
            >
              <Link to="/signup">
                Create a student account
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
