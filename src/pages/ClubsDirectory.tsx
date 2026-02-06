import { useDeferredValue, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, X, AlertCircle, LayoutGrid, List, Shield, ChevronRight, Sparkles, Plus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClubCard from "@/components/ClubCard";
import ClubListItem from "@/components/ClubListItem";
import RequestNewClubModal from "@/components/RequestNewClubModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClubs } from "@/hooks/useExternalDB";

const CATEGORY_OPTIONS = [
  "All",
  "Academic",
  "Cultural",
  "Fraternity",
  "Greek Life",
  "Professional",
  "Service",
  "Social",
  "Sorority",
  "Spiritual",
  "Sports",
  "Tech / STEM",
];

// Greek life related terms for combined filtering
const GREEK_LIFE_TERMS = ["fraternity", "sorority", "interfraternity", "panhellenic", "greek life", "greek"];

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showClaimInfo, setShowClaimInfo] = useState(true);
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
    const isGreekLifeFilter = selectedCategory === "Greek Life";

    return indexedClubs
      .filter(({ categoryBucketKey, categoryKey, searchKey }) => {
        // Special handling for Greek Life - match any Greek-related terms
        let matchesCategory: boolean;
        if (selectedCategory === "All") {
          matchesCategory = true;
        } else if (isGreekLifeFilter) {
          matchesCategory = GREEK_LIFE_TERMS.some(
            (term) => categoryBucketKey.includes(term) || categoryKey.includes(term)
          );
        } else {
          // Standard filter: match on category_bucket OR category
          matchesCategory =
            categoryBucketKey === selectedCategoryKey ||
            categoryKey === selectedCategoryKey;
        }

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
            <p className="text-muted-foreground mb-4">
              {loading
                ? "Loading clubs..."
                : `Explore ${clubs.length} student organizations`}
            </p>
            <RequestNewClubModal
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Can't find your club? Request to add it
                </Button>
              }
            />
          </motion.div>
        </div>
      </section>

      {/* Club Claiming Info Banner */}
      <AnimatePresence>
        {showClaimInfo && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pb-4 px-4"
          >
            <div className="container mx-auto max-w-4xl">
              <Alert className="bg-gold/5 border-gold/20 relative">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-gold" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      <span className="text-sm font-semibold text-foreground">Are you a club leader?</span>
                    </div>
                    <AlertDescription className="text-sm text-muted-foreground">
                      <span className="block mb-2">
                        Claim your club to access the Admin Portal where you can manage events, track recruitment, and update your club's profile.
                      </span>
                      <div className="flex flex-col sm:flex-row gap-2 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center font-medium text-[10px]">1</span>
                          Search for your club below
                        </span>
                        <ChevronRight className="hidden sm:block w-3 h-3 text-muted-foreground/50" />
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center font-medium text-[10px]">2</span>
                          Click "Claim this club" on the detail page
                        </span>
                        <ChevronRight className="hidden sm:block w-3 h-3 text-muted-foreground/50" />
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center font-medium text-[10px]">3</span>
                          Verify via email
                        </span>
                      </div>
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowClaimInfo(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Alert>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Search and Filter Controls */}
      <section className="pb-8 px-4">
        <div className="container mx-auto max-w-4xl">
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

            {/* View Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden h-12">
              <Toggle
                pressed={viewMode === "list"}
                onPressedChange={() => setViewMode("list")}
                className="rounded-none border-0 px-3 data-[state=on]:bg-muted"
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </Toggle>
              <Toggle
                pressed={viewMode === "grid"}
                onPressedChange={() => setViewMode("grid")}
                className="rounded-none border-0 border-l border-border px-3 data-[state=on]:bg-muted"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-5 h-5" />
              </Toggle>
            </div>
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

              {/* Clubs List/Grid */}
              {filteredClubs.length > 0 ? (
                viewMode === "list" ? (
                  <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                    {filteredClubs.map((club) => (
                      <ClubListItem key={club.id} club={club} />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredClubs.map((club) => (
                      <ClubCard key={club.id} club={club} />
                    ))}
                  </div>
                )
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
