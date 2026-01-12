import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FAQSection = () => {
  return (
    <section className="py-12 md:py-16 bg-secondary/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              FAQ
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Got questions?
            </h2>
            <p className="text-muted-foreground text-lg font-light mb-8">
              Find answers to common questions about UniCircle.
            </p>
            <Link to="/faq">
              <Button variant="outline" className="group border-gold/30 hover:border-gold hover:bg-gold/5">
                View All FAQs
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
