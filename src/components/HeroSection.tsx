import { Button } from "@/components/ui/button";
import { LogIn, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="min-h-[80vh] flex items-center pt-20 pb-12 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] mb-6 text-foreground"
          >
            The easiest way to discover{" "}
            <span className="text-gold">clubs & events</span> at UCSD
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Stop missing out. One simple place to find what's happening on campus and the clubs you'll actually want to join.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="gold" size="lg" className="group" asChild>
              <Link to="/login">
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="group" asChild>
              <Link to="/clubs">
                <Calendar className="w-4 h-4" />
                See Clubs & Events
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
