import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Filter, Loader2, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClubCard from "@/components/ClubCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClubs } from "@/hooks/useExternalDB";

const ClubsDirectory = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: clubs, loading, error } = useClubs();

  // Filter clubs by search and category
  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesCategory = selectedCategory === "All" || club.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [clubs, selectedCategory, searchQuery]);

  // Extract unique categories from data (filter out empty ones)
  const dynamicCategories = useMemo(() => {
    const uniqueCategories = new Set(
      clubs
        .map(c => c.category)
        .filter(cat => cat && cat.trim() && !cat.toLowerCase().includes('viewing'))
    );
    return ["All", ...Array.from(uniqueCategories).sort()];
  }, [clubs]);

  const showCategoryFilter = dynamicCategories.length > 1;

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-28 pb-6 md:pt-32 md:pb-8 px-4">
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
              {loading 
                ? "Loading clubs..." 
                : `Explore ${clubs.length} student organizations at UCSD`}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="pb-4 px-4">
        <div className="container mx-auto max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Category Filter - only show if we have categories */}
      {showCategoryFilter && (
        <section className="pb-8 px-4">
          <div className="container mx-auto">
            <div className="flex flex-wrap justify-center gap-2">
              {dynamicCategories.map((category) => (
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
      )}

      {/* Results */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
              <p className="text-muted-foreground">Loading clubs...</p>
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                Error loading clubs
              </h3>
              <p className="text-muted-foreground">{error}</p>
            </motion.div>
          ) : (
            <>
              {/* Results Count */}
              <p className="text-sm text-muted-foreground mb-6 text-center">
                Showing {filteredClubs.length} club{filteredClubs.length !== 1 ? 's' : ''}
                {selectedCategory !== "All" && ` in ${selectedCategory}`}
                {searchQuery && ` matching "${searchQuery}"`}
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
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                    No clubs found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  {(searchQuery || selectedCategory !== "All") && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ClubsDirectory;
