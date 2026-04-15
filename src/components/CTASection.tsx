import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedWords from "./AnimatedWords";
import { useSoundEffects } from "@/hooks/useSoundEffects";

const CTASection = () => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <section id="cta" className="py-16 md:py-24 border-t border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-14">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">

          {/* Left: headline */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[11px] font-semibold text-gold tracking-[0.25em] uppercase mb-8"
            >
              Get started
            </motion.p>
            <AnimatedWords
              text="Fix it today."
              as="h2"
              className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight text-white/70"
              goldWords={["today."]}
            />
          </div>

          {/* Right: description + CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-6 lg:items-end"
          >
            <p className="text-white text-base leading-relaxed max-w-xs lg:text-right">
              Free to start. No spreadsheets. No chasing people down. Just a clean process your whole team can actually use.
            </p>
            <div className="flex items-center gap-8">
              <Link
                to="/clubs"
                className="group flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-gold transition-colors duration-200"
                onClick={playClick}
                onMouseEnter={playHover}
              >
                Claim your club
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <Link
                to="/signup"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
                onClick={playClick}
                onMouseEnter={playHover}
              >
                Create account
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default CTASection;
