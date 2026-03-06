import { useEffect, useDeferredValue, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, X, AlertCircle, Sparkles, Plus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClubCard from "@/components/ClubCard";
import RequestNewClubModal from "@/components/RequestNewClubModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClubs } from "@/hooks/useExternalDB";
import { useAuth } from "@/hooks/useAuth";
import { useSavedClubs } from "@/hooks/useSavedClubs";
import { toast } from "sonner";

const CATEGORIES = [
  { label: 'All', color: 'hsl(43 74% 56%)' },
  { label: 'Academic', color: '#60a5fa' },
  { label: 'Cultural', color: '#fb923c' },
  { label: 'Fraternity', color: '#a78bfa' },
  { label: 'Greek Life', color: '#c084fc' },
  { label: 'Professional', color: '#818cf8' },
  { label: 'Service', color: '#34d399' },
  { label: 'Social', color: '#f472b6' },
  { label: 'Sorority', color: '#fb7185' },
  { label: 'Spiritual', color: '#2dd4bf' },
  { label: 'Sports', color: '#f87171' },
  { label: 'Tech / STEM', color: '#22d3ee' },
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
  const deferredSearchText = useDeferredValue(searchText);
  const { data: clubs, loading, error } = useClubs();
  const { user } = useAuth();
  const { savedClubs, fetchSavedClubs, saveClub, unsaveClub, isSaved } = useSavedClubs();

  useEffect(() => {
    if (user) fetchSavedClubs(user.id);
  }, [user, fetchSavedClubs]);

  const handleToggleSave = async (clubId: string) => {
    if (!user) {
      toast.error('Please log in to save clubs');
      return;
    }
    const club = clubs.find((c) => c.id === clubId);
    if (isSaved(clubId)) {
      const r = await unsaveClub(user.id, clubId);
      if (r.success) toast.success('Club unsaved');
    } else {
      const r = await saveClub(user.id, clubId, club?.name || '');
      if (r.success) toast.success('Club saved!');
    }
  };

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
    <main className="min-h-screen bg-[#0A0A0A] dark">
      <Header />

      {/* Hero */}
      <section className="pt-28 pb-6 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 mb-2">
            UC San Diego
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight mb-2">
            Student Organizations
          </h1>
          <p className="text-zinc-500 mb-6">
            {loading ? "Loading clubs..." : `${clubs.length} clubs across every interest`}
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search clubs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-12 bg-white/5 border-white/10 text-white pl-11 pr-10 rounded-2xl focus:border-white/30 focus:ring-0 placeholder:text-zinc-600"
            />
            {searchText && (
              <button
                onClick={() => setSearchText("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <RequestNewClubModal
            trigger={
              <button className="mt-3 text-xs text-zinc-600 hover:text-white transition-colors">
                Can't find your club? Request it
              </button>
            }
          />
        </div>
      </section>

      {/* Category pills - horizontal scroll */}
      <section className="pb-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setSelectedCategory(cat.label)}
                  className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap"
                  style={
                    isActive
                      ? {
                          background: cat.color,
                          color: '#000',
                          border: `1px solid ${cat.color}`,
                        }
                      : {
                          background: 'transparent',
                          color: '#71717a',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = '#71717a';
                    }
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
              <p className="text-zinc-500">Loading clubs...</p>
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-display font-semibold text-white mb-2">
                Error loading clubs
              </h3>
              <p className="text-zinc-500">{error}</p>
            </motion.div>
          ) : (
            <>
              {/* Results count */}
              <p className="text-xs text-zinc-600 mb-5">
                {filteredClubs.length} clubs{selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
              </p>

              {filteredClubs.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedCategory + deferredSearchText}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {filteredClubs.map((club, i) => (
                      <motion.div
                        key={club.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35 }}
                      >
                        <ClubCard
                          club={club}
                          isSaved={isSaved(club.id)}
                          onToggleSave={handleToggleSave}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-white mb-2">
                    No clubs match your search.
                  </h3>
                  <p className="text-zinc-500 mb-4">
                    Try adjusting your search or category filter
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="border-white/10 text-zinc-300 hover:text-white hover:border-white/30"
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
