import { motion } from "framer-motion";
import { useState } from "react";
import { X, MessageSquare, CalendarX, Users, Compass } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

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
  const isMobile = useIsMobile();

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

          {/* Background floating particles */}
          <div className="relative">
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

            {isMobile ? (
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2">
                  {problems.map((problem, index) => (
                    <CarouselItem key={index} className="pl-2 basis-[85%]">
                      <ProblemCard
                        problem={problem}
                        index={index}
                        activeIndex={activeIndex}
                        expandedIndex={expandedIndex}
                        setActiveIndex={setActiveIndex}
                        setExpandedIndex={setExpandedIndex}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {/* Swipe indicator dots */}
                <div className="flex justify-center gap-1.5 mt-4">
                  {problems.map((_, index) => (
                    <div
                      key={index}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Swipe to explore
                </p>
              </Carousel>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {problems.map((problem, index) => (
                  <ProblemCard
                    key={index}
                    problem={problem}
                    index={index}
                    activeIndex={activeIndex}
                    expandedIndex={expandedIndex}
                    setActiveIndex={setActiveIndex}
                    setExpandedIndex={setExpandedIndex}
                  />
                ))}
              </div>
            )}
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