import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import FloatingParticles from "./FloatingParticles";

const HeroSection = () => {
  return (
    <section className="min-h-[85vh] flex items-center pt-20 pb-8 relative overflow-hidden">
      {/* Floating particles */}
      <FloatingParticles />
      {/* Animated gradient orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gold/20 rounded-full blur-[100px] -z-10" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[80px] -z-10" 
      />
      <motion.div 
        animate={{ 
          x: [0, 50, 0],
          y: [0, -30, 0],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-gold/10 to-transparent rounded-full blur-[60px] -z-10" 
      />

      {/* Floating geometric shapes */}
      <motion.div
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 10, 0]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-[15%] w-16 h-16 border border-gold/30 rounded-2xl hidden lg:block"
      />
      <motion.div
        animate={{ 
          y: [0, 15, 0],
          rotate: [0, -15, 0]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/3 left-[12%] w-12 h-12 bg-gold/10 rounded-full hidden lg:block"
      />
      <motion.div
        animate={{ 
          y: [0, -10, 0],
          x: [0, 10, 0]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/3 left-[20%] w-8 h-8 border border-gold/20 rotate-45 hidden lg:block"
      />
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-[20%] w-6 h-6 bg-gold/30 rounded-full hidden lg:block"
      />

      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full -z-10 hidden lg:block" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <motion.path
          d="M200,400 Q400,200 600,400 T1000,400"
          stroke="url(#goldGradient)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        <motion.circle
          cx="600"
          cy="400"
          r="150"
          stroke="url(#goldGradient)"
          strokeWidth="0.5"
          fill="none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 1.5, delay: 1 }}
        />
        <motion.circle
          cx="600"
          cy="400"
          r="100"
          stroke="url(#goldGradient)"
          strokeWidth="0.5"
          fill="none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 1.5, delay: 1.2 }}
        />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--gold))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          />

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] mb-6 text-foreground"
          >
            UCSD isn't socially dead.
            <br />
            <span className="text-muted-foreground">
              You just haven't found your{" "}
              <span className="text-gold relative">
                circle
                <motion.span
                  className="absolute -inset-2 bg-gold/10 rounded-lg -z-10"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                />
              </span>{" "}
              yet.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed font-light"
          >
            Where campus connection meets clarity, community, and ambition. 
            Discover everything happening at UCSD - in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mb-8 justify-center"
          >
            <Button variant="gold" size="lg" className="group" asChild>
              <a href="#cta">
                Join the Waitlist
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="group" asChild>
              <a href="#problem">
                See how it works
                <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              </a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-sm text-muted-foreground"
          >
            Be part of the first wave of students building a new social reality.
          </motion.p>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
      >
        <span className="text-xs text-muted-foreground">Scroll</span>
        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-gold to-transparent"
        />
      </motion.div>
    </section>
  );
};

export default HeroSection;