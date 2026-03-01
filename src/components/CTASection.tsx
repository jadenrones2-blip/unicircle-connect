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
    <section id="cta" className="scroll-mt-24 py-20 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
      <GoldMeshBackground />

      <div className="container mx-auto px-5 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <AnimatedWords
            text="Ready to start?"
            as="h2"
            className="font-display text-3xl sm:text-4xl md:text-6xl font-semibold mb-8 sm:mb-10 text-primary-foreground"
            goldWords={["start?"]}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
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
                Create account
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
