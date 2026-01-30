import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, X, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClubCard from "@/components/ClubCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClubs } from "@/hooks/useExternalDB";

const CATEGORY_OPTIONS = [
  "All",
  "Academic",
  "Cultural",
  "Fraternity",
  "Professional",
  "Service",
  "Social",
  "Sorority",
  "Spiritual",
  "Sports",
  "Tech / STEM",
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ClubsDirectory = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const deferredSearchText = useDeferredValue(searchText);
  const { data: clubs, loading, error } = useClubs();

  // Precompute normalized search/category keys once per dataset refresh
  const indexedClubs = useMemo(() => {
    const sorted = clubs.slice().sort((a, b) => a.name.localeCompare(b.name));

    return sorted.map((club) => {
      // Use category_bucket for dropdown filtering (exact match)
      const categoryBucketKey = normalizeText(club.categoryBucket || "");
      // Also normalize the category field for special cases like "Spiritual"
      const categoryKey = normalizeText(club.category || "");
      // Search only filters name and description (not category)
      const searchParts = [club.name, club.description].filter(
        (v): v is string => Boolean(v)
      );
      const searchKey = normalizeText(searchParts.join(" "));

      return { club, categoryBucketKey, categoryKey, searchKey };
    });
  }, [clubs]);

  // Filter clubs (deferred so typing stays responsive)
  const filteredClubs = useMemo(() => {
    const selectedCategoryKey =
      selectedCategory === "All" ? "" : normalizeText(selectedCategory);
    const query = normalizeText(deferredSearchText);

    return indexedClubs
      .filter(({ categoryBucketKey, categoryKey, searchKey }) => {
        // Category filter: match on category_bucket OR category (for special cases like "Spiritual")
        const matchesCategory =
          selectedCategory === "All" || 
          categoryBucketKey === selectedCategoryKey ||
          categoryKey === selectedCategoryKey;

        // Search filter: name OR description contains query
        const matchesSearch = !query || searchKey.includes(query);

        return matchesCategory && matchesSearch;
      })
      .map(({ club }) => club);
  }, [deferredSearchText, indexedClubs, selectedCategory]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
  };

  const hasActiveFilters = searchText || selectedCategory !== "All";

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

      {/* Search and Filter Controls */}
      <section className="pb-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search clubs"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 pr-10 h-12"
              />
              {searchText && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setSearchText("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Category Dropdown */}
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-12">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

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
                <AlertCircle className="w-8 h-8 text-destructive" />
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
                Showing {filteredClubs.length} club
                {filteredClubs.length !== 1 ? "s" : ""}
                {selectedCategory !== "All" && ` in ${selectedCategory}`}
                {searchText && ` matching "${searchText}"`}
              </p>

              {/* Clubs Grid */}
              {filteredClubs.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredClubs.map((club) => (
                    <ClubCard key={club.id} club={club} />
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
                    No clubs match your search.
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or category filter
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
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
