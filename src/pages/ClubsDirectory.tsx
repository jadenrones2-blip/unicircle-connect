import { useState } from "react";
import { motion } from "framer-motion";
import { Filter } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClubCard from "@/components/ClubCard";
import { Badge } from "@/components/ui/badge";
import { clubs, categories } from "@/data/mockData";

const ClubsDirectory = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredClubs = clubs.filter((club) => {
    return selectedCategory === "All" || club.category === selectedCategory;
  });

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-8 md:pt-32 md:pb-10 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Clubs Directory
            </h1>
            <p className="text-muted-foreground">
              Explore {clubs.length} student organizations at UCSD
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="pb-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`cursor-pointer transition-all px-4 py-1.5 text-sm ${
                  selectedCategory === category 
                    ? "bg-gold text-primary-foreground hover:bg-gold/90" 
                    : "hover:border-gold/50"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {/* Results Count */}
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Showing {filteredClubs.length} club{filteredClubs.length !== 1 ? 's' : ''}
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
          </p>

          {/* Clubs Grid */}
          {filteredClubs.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredClubs.map((club, index) => (
                <ClubCard key={club.id} club={club} index={index} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                No clubs found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ClubsDirectory;
