import { motion } from "framer-motion";
import { Building2, CalendarDays, Rocket, Users2 } from "lucide-react";
import { useState } from "react";

const features = [
  { icon: Building2, label: "Clubs", desc: "Every student organization, searchable" },
  { icon: CalendarDays, label: "Events", desc: "Live campus calendar, never miss out" },
  { icon: Rocket, label: "Projects", desc: "Side projects & startup teams" },
  { icon: Users2, label: "Communities", desc: "Interest-based groups and circles" },
];

const SolutionSection = () => {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="solution" className="py-12 md:py-16 bg-secondary/50">
      <div className="container mx-auto">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              The Solution
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Unicircle solves this
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-light">
              One platform for everything happening at UCSD. 
              Search, discover, connect - instantly.
            </p>
          </motion.div>

          {/* Interactive Feature Preview */}
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  onHoverStart={() => {
                    setHoveredIndex(index);
                    setActiveFeature(index);
                  }}
                  onHoverEnd={() => setHoveredIndex(null)}
                  onClick={() => setActiveFeature(index)}
                  className={`group p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                    activeFeature === index 
                      ? "bg-card border-gold/40 shadow-md" 
                      : hoveredIndex === index
                        ? "bg-card border-gold/20"
                        : "bg-card/50 border-border"
                  }`}
                >
                  <div className={`p-2 rounded-md w-fit mb-3 transition-all duration-300 ${
                    activeFeature === index ? "bg-gold/10" : "bg-secondary"
                  }`}>
                    <feature.icon className={`w-4 h-4 transition-colors duration-300 ${
                      activeFeature === index ? "text-gold" : "text-muted-foreground"
                    }`} />
                  </div>
                  <p className="font-medium text-sm text-foreground">{feature.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Dynamic Preview Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-lg border border-border overflow-hidden shadow-lg"
            >
              {/* Browser Chrome */}
              <div className="bg-secondary/80 px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-background rounded-md px-4 py-1.5 text-xs text-muted-foreground border border-border">
                    unicircle.app/{features[activeFeature ?? 0]?.label.toLowerCase()}
                  </div>
                </div>
              </div>

              {/* Dynamic Content */}
              <div className="p-6">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-md bg-gold/10">
                      {activeFeature !== null && (
                        <motion.div
                          key={activeFeature}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                        >
                          {(() => {
                            const Icon = features[activeFeature]?.icon || features[0].icon;
                            return <Icon className="w-5 h-5 text-gold" />;
                          })()}
                        </motion.div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-semibold">
                        {features[activeFeature ?? 0]?.label}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {features[activeFeature ?? 0]?.desc}
                      </p>
                    </div>
                  </div>

                  {/* Mock UI based on feature */}
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border"
                      >
                        <div className="w-8 h-8 rounded-md bg-muted" />
                        <div className="flex-1">
                          <div className="h-3 w-24 rounded bg-muted mb-1" />
                          <div className="h-2 w-16 rounded bg-muted/50" />
                        </div>
                        <div className="h-6 w-14 rounded bg-gold/20 border border-gold/30" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center text-muted-foreground"
          >
            Instead of searching everywhere, you have{" "}
            <span className="text-gold font-medium">one place</span> to discover everything.
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;