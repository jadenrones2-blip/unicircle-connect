import { motion } from "framer-motion";
import { useState } from "react";
import { X, MessageSquare, CalendarX, Users, Compass } from "lucide-react";

const problems = [
  {
    icon: Users,
    title: "Hard to meet people outside your major",
    detail: "Your classes limit your social circle. Meeting people with different interests feels like chance.",
  },
  {
    icon: Compass,
    title: "Clubs scattered across platforms",
    detail: "Instagram, Discord, Linktree, flyers - finding the right club is a scavenger hunt.",
  },
  {
    icon: CalendarX,
    title: "Events get lost or overlooked",
    detail: "You hear about the best events after they happen. No central calendar exists.",
  },
  {
    icon: MessageSquare,
    title: "Finding ambitious peers feels impossible",
    detail: "Where do you find co-founders, collaborators, or people who think like you?",
  },
];

const ProblemSection = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <section id="problem" className="py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              Why we built this
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              The disconnect is real
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-light">
              Being a student at UCSD means juggling majors, clubs, and events - 
              but the connections are scattered.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5 relative">
            {/* Background floating particles */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
              <motion.div 
                animate={{ 
                  y: [0, -20, 0],
                  x: [0, 10, 0],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 left-10 w-32 h-32 rounded-full bg-gold/10 blur-3xl"
              />
              <motion.div 
                animate={{ 
                  y: [0, 15, 0],
                  x: [0, -15, 0],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl"
              />
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gold/5 blur-3xl"
              />
            </div>

            {problems.map((problem, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onHoverStart={() => setActiveIndex(index)}
                onHoverEnd={() => setActiveIndex(null)}
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`group relative p-6 rounded-xl border cursor-pointer transition-all duration-500 overflow-hidden ${
                  activeIndex === index || expandedIndex === index
                    ? "bg-card border-gold/30 shadow-xl shadow-gold/10" 
                    : "bg-card/50 border-border hover:border-gold/20 hover:shadow-lg"
                }`}
              >
                {/* Animated gradient background */}
                <motion.div 
                  className="absolute inset-0 -z-10"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: activeIndex === index || expandedIndex === index ? 1 : 0 
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-primary/5" />
                  <motion.div 
                    animate={{ 
                      rotate: [0, 360],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-conic from-gold/10 via-transparent to-gold/10 blur-2xl"
                  />
                </motion.div>

                {/* Shimmer effect on hover */}
                <motion.div
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ 
                    x: activeIndex === index ? "200%" : "-100%",
                    opacity: activeIndex === index ? [0, 0.5, 0] : 0
                  }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -z-10"
                />

                {/* Decorative gradient orb */}
                <motion.div 
                  animate={{ 
                    scale: activeIndex === index || expandedIndex === index ? [1, 1.2, 1] : 1,
                    opacity: activeIndex === index || expandedIndex === index ? 0.4 : 0
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl bg-gold/40"
                />

                {/* Corner accent */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: activeIndex === index || expandedIndex === index ? 1 : 0,
                    opacity: activeIndex === index || expandedIndex === index ? 1 : 0
                  }}
                  className="absolute top-0 right-0 w-16 h-16"
                >
                  <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-gold to-transparent" />
                  <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-gold to-transparent" />
                </motion.div>
                
                <div className="relative flex items-start gap-5">
                  {/* Floating mini particles around icon */}
                  <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none">
                    <motion.div
                      animate={{ 
                        y: [0, -8, 0],
                        x: [0, 4, 0],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                      className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-gold/60"
                    />
                    <motion.div
                      animate={{ 
                        y: [0, 6, 0],
                        x: [0, -3, 0],
                        opacity: [0.2, 0.5, 0.2]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 + 0.5 }}
                      className="absolute bottom-2 left-0 w-1 h-1 rounded-full bg-gold/40"
                    />
                    <motion.div
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.4, 0.2]
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
                      className="absolute top-3 -left-1 w-1 h-1 rounded-full bg-primary/40"
                    />
                  </div>

                  {/* Enhanced icon container with continuous animation */}
                  <motion.div 
                    className={`relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      activeIndex === index || expandedIndex === index
                        ? "bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30" 
                        : "bg-secondary/80 border border-border"
                    }`}
                    animate={{ 
                      scale: activeIndex === index || expandedIndex === index ? 1.05 : 1,
                      rotate: activeIndex === index ? 3 : 0
                    }}
                  >
                    {/* Animated icon */}
                    <motion.div
                      animate={{
                        y: [0, -2, 0],
                        rotate: [0, 2, 0, -2, 0],
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: index * 0.5
                      }}
                    >
                      <problem.icon className={`w-6 h-6 transition-all duration-300 ${
                        activeIndex === index || expandedIndex === index
                          ? "text-gold" 
                          : "text-muted-foreground"
                      }`} />
                    </motion.div>
                    
                    {/* Continuous subtle pulse ring */}
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.1, 0.2, 0.1]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                      className="absolute inset-0 rounded-xl border border-gold/20"
                    />
                    
                    {/* Icon glow effect with pulse on hover */}
                    {(activeIndex === index || expandedIndex === index) && (
                      <>
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 rounded-xl bg-gold/10 blur-sm -z-10"
                        />
                        <motion.div 
                          animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 0, 0.3]
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                          className="absolute inset-0 rounded-xl border border-gold/30 -z-10"
                        />
                      </>
                    )}
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium mb-1 transition-colors duration-300 ${
                      activeIndex === index || expandedIndex === index
                        ? "text-foreground"
                        : "text-foreground/90"
                    }`}>
                      {problem.title}
                    </h3>
                    <motion.div
                      initial={false}
                      animate={{ 
                        height: expandedIndex === index ? "auto" : 0,
                        opacity: expandedIndex === index ? 1 : 0
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-muted-foreground pt-2 leading-relaxed">
                        {problem.detail}
                      </p>
                    </motion.div>
                  </div>
                  
                  {/* Expand indicator with animation */}
                  <motion.div
                    animate={{ 
                      rotate: expandedIndex === index ? 45 : 0,
                      scale: activeIndex === index ? 1.1 : 1
                    }}
                    whileHover={{ scale: 1.2 }}
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      activeIndex === index || expandedIndex === index
                        ? "bg-gold/10 text-gold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.div>
                </div>

                {/* Bottom border glow */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ 
                    scaleX: activeIndex === index || expandedIndex === index ? 1 : 0,
                    opacity: activeIndex === index || expandedIndex === index ? 1 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
                />
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="font-display text-2xl md:text-3xl lg:text-4xl text-muted-foreground font-light leading-relaxed">
              Students want connection. Clubs want reach.
            </p>
            <p className="font-display text-2xl md:text-3xl lg:text-4xl font-semibold mt-3 text-gold">
              Campus needs a pulse.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;