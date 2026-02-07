import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section id="cta" className="scroll-mt-24 py-12 md:py-16 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gold/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-5 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.h2 
            className="font-display text-2xl sm:text-3xl md:text-5xl font-semibold mb-4 sm:mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Stop scrolling.{" "}
            <span className="text-gold">Start belonging.</span>
          </motion.h2>
          
          <motion.p 
            className="text-primary-foreground/70 text-base sm:text-lg mb-6 sm:mb-8 font-light px-2 sm:px-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Your people are out there.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            UniCircle helps you find them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <Button variant="gold" size="lg" className="group" asChild>
              <Link to="/login">
                <LogIn className="w-4 h-4" />
                Find Your Circle
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;