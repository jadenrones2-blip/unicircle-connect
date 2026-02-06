import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Bell, 
  ChevronRight, 
  Stethoscope, 
  Laptop, 
  Briefcase,
  Rocket,
  Palette,
  Zap,
  BookOpen,
  Users,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";

type CategoryKey = "communities" | "clubs" | "events";

interface CategoryCard {
  title: string;
  description: string;
  icon: LucideIcon;
}

const categoryData: Record<CategoryKey, { searchPlaceholder: string; cards: CategoryCard[] }> = {
  communities: {
    searchPlaceholder: "Search communities...",
    cards: [
      { title: "Pre-Med Community", description: "Study groups, MCAT help, resources, and mentorship.", icon: Stethoscope },
      { title: "Computer Science Circle", description: "Coding help, project collabs, recruiting tips.", icon: Laptop },
      { title: "Business & Marketing Network", description: "Opportunities, insights, and team projects.", icon: Briefcase },
    ],
  },
  clubs: {
    searchPlaceholder: "Search clubs...",
    cards: [
      { title: "Triton AI", description: "Machine learning research and workshops.", icon: Laptop },
      { title: "Design Co", description: "UX/UI design community and mentorship.", icon: Palette },
      { title: "Startup Hub", description: "Entrepreneurship and venture building.", icon: Rocket },
    ],
  },
  events: {
    searchPlaceholder: "Search events...",
    cards: [
      { title: "Hackathon Weekend", description: "48-hour coding competition with prizes.", icon: Zap },
      { title: "Study Jam (Finals Week)", description: "Group study sessions at Geisel Library.", icon: BookOpen },
      { title: "Networking Night", description: "Meet industry professionals and alumni.", icon: Users },
    ],
  },
};

const categories: { key: CategoryKey; label: string }[] = [
  { key: "communities", label: "Communities" },
  { key: "clubs", label: "Clubs" },
  { key: "events", label: "Events" },
];

const UIPreviewSection = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("communities");
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const currentData = categoryData[activeCategory];

  return (
    <section className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <span className="text-gold text-sm font-medium tracking-wide uppercase mb-4 block">
              The Interface
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
              Simple, elegant, powerful
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto font-light">
              Clean search. Organized discovery. A live feed of what's happening. 
              No clutter, just clarity.
            </p>
          </div>

          {/* Interactive UI Mockup */}
          <motion.div 
            className="bg-card rounded-xl border border-border overflow-hidden shadow-xl"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
          >
            {/* App Header */}
            <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold tracking-tight">
                UniCircle
              </span>
              <div className="flex items-center gap-4">
                <Bell className="w-4 h-4 text-primary-foreground/60" />
                <div className="w-6 h-6 rounded-full bg-gold/20" />
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Search Bar */}
              <motion.div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 mb-6 ${
                  searchFocused 
                    ? "border-gold/50 bg-gold/5 shadow-md shadow-gold/10" 
                    : "border-border bg-secondary/30 hover:border-gold/30"
                }`}
                onHoverStart={() => setSearchFocused(true)}
                onHoverEnd={() => setSearchFocused(false)}
                whileHover={{ y: -2 }}
              >
                <Search className={`w-4 h-4 transition-colors ${
                  searchFocused ? "text-gold" : "text-muted-foreground"
                }`} />
                <span className="text-sm text-muted-foreground flex-1">
                  {currentData.searchPlaceholder}
                </span>
              </motion.div>

              {/* Category Tabs */}
              <div className="flex gap-1 mb-6 p-1 bg-secondary/50 rounded-lg overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-3 py-2 text-xs sm:text-sm rounded-md transition-all duration-300 whitespace-nowrap ${
                      activeCategory === cat.key
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {currentData.cards.map((card, index) => {
                    const IconComponent = card.icon;
                    const isHovered = hoveredCard === index;
                    
                    return (
                      <motion.div
                        key={card.title}
                        onHoverStart={() => setHoveredCard(index)}
                        onHoverEnd={() => setHoveredCard(null)}
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className={`p-4 rounded-lg border transition-all duration-300 cursor-pointer ${
                          isHovered
                            ? "bg-card border-gold/40 shadow-lg shadow-gold/10"
                            : "bg-secondary/30 border-border hover:border-gold/20"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <motion.div 
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              isHovered ? "bg-gold/15" : "bg-muted"
                            }`}
                            animate={{ rotate: isHovered ? 5 : 0 }}
                          >
                            <IconComponent className={`w-5 h-5 transition-colors ${
                              isHovered ? "text-gold" : "text-muted-foreground"
                            }`} />
                          </motion.div>
                          <ChevronRight className={`w-4 h-4 transition-all ${
                            isHovered ? "text-gold translate-x-1" : "text-muted-foreground"
                          }`} />
                        </div>
                        <p className={`font-medium text-sm mb-1 transition-colors ${
                          isHovered ? "text-foreground" : "text-foreground/90"
                        }`}>
                          {card.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            UniCircle isn't another app — it's the{" "}
            <span className="text-gold">missing layer of community</span> your campus has needed.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default UIPreviewSection;
