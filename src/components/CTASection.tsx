import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20 md:py-32 border-t border-white/[0.07]">
      <div className="max-w-5xl mx-auto px-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-end">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs tracking-[0.25em] uppercase text-[#C9A84C] font-semibold mb-8">
              Get started
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.0] tracking-tight">
              The right room<br />
              <span className="text-[#C9A84C]">is waiting.</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="space-y-6"
          >
            <p className="text-zinc-400 text-base leading-relaxed">
              Whether you're a student looking for where you actually belong, or a club trying to run a real process — UniCircle is free and ready today.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                to="/clubs"
                className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-zinc-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors w-fit"
              >
                Explore clubs
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/club-admin/request"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors group w-fit"
              >
                Get your org on UniCircle
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <p className="text-zinc-600 text-xs pt-2">
              Currently at UC San Diego. SDSU next.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default CTASection;
