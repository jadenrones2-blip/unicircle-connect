import { useEffect, useDeferredValue, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Search, X, AlertCircle,
  LayoutGrid, GraduationCap, Globe, Shield, Star,
  Briefcase, Heart, MessageSquare, Users, Flame, Trophy, Cpu,
  type LucideIcon,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClubCard from "@/components/ClubCard";
import RequestNewClubModal from "@/components/RequestNewClubModal";
import RecommendationChat from "@/components/RecommendationChat";
import CampusSearch from "@/components/CampusSearch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClubs } from "@/hooks/useExternalDB";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSavedClubs } from "@/hooks/useSavedClubs";
import { useUserInterests } from "@/hooks/useUserInterests";
import { calculateMatchScore, getTopMatchTerm, resumeHitsClub } from "@/lib/clubRecommendations";
import { toast } from "sonner";

const CATEGORIES: { label: string; color: string; icon: LucideIcon }[] = [
  { label: 'All',          color: 'hsl(43 74% 56%)', icon: LayoutGrid },
  { label: 'Academic',     color: '#60a5fa',          icon: GraduationCap },
  { label: 'Cultural',     color: '#fb923c',          icon: Globe },
  { label: 'Fraternity',   color: '#a78bfa',          icon: Shield },
  { label: 'Greek Life',   color: '#c084fc',          icon: Star },
  { label: 'Professional', color: '#818cf8',          icon: Briefcase },
  { label: 'Service',      color: '#34d399',          icon: Heart },
  { label: 'Social',       color: '#f472b6',          icon: MessageSquare },
  { label: 'Sorority',     color: '#fb7185',          icon: Users },
  { label: 'Spiritual',    color: '#2dd4bf',          icon: Flame },
  { label: 'Sports',       color: '#f87171',          icon: Trophy },
  { label: 'Tech / STEM',  color: '#22d3ee',          icon: Cpu },
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

// Maps each club to the canonical filter bucket label (normalized) based on real DB values.
// category_bucket is reliable except for Fraternity, Sorority, Interfraternity (bucketed as "Social")
// and Spiritual (bucketed as "Cultural") \u2014 those are overridden by the category field.
function getFilterBucket(rawBucket: string, rawCategory: string): string {
  const cat = rawCategory.trim().toLowerCase();
  if (cat === 'fraternity' || cat === 'interfraternity') return 'fraternity';
  if (cat === 'sorority' || cat === 'sororit') return 'sorority';
  if (cat === 'spiritual') return 'spiritual';
  const bucket = rawBucket.trim().toLowerCase();
  if (bucket === 'tech / stem') return 'tech stem';
  return bucket; // academic, cultural, professional, service, sports, social \u2192 direct match
}

const LS_KEY = 'clubs_filters';

function loadFilters() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { search: string; category: string; recruiting: boolean };
  } catch { return null; }
}

const ClubsDirectory = () => {
  const saved = loadFilters();
  const [searchText, setSearchText] = useState(saved?.search ?? "");
  const [selectedCategory, setSelectedCategory] = useState(saved?.category ?? "All");
  const [recruitingOnly, setRecruitingOnly] = useState(saved?.recruiting ?? false);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        search: searchText,
        category: selectedCategory,
        recruiting: recruitingOnly,
      }));
    } catch { /* storage full or unavailable */ }
  }, [searchText, selectedCategory, recruitingOnly]);
  const deferredSearchText = useDeferredValue(searchText);
  const { data: clubs, loading, error } = useClubs();
  const { user } = useAuth();
  const { savedClubs, fetchSavedClubs, saveClub, unsaveClub, isSaved } = useSavedClubs();
  const { fetchInterests, fetchResumeSignals } = useUserInterests();
  const [interestValues, setInterestValues] = useState<string[]>([]);
  const [resumeSignals, setResumeSignals] = useState<string[]>([]);
  const [appliedClubIds, setAppliedClubIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) fetchSavedClubs(user.id);
  }, [user, fetchSavedClubs]);

  useEffect(() => {
    if (!user) return;
    fetchInterests(user.id).then((data) => {
      if (data) setInterestValues(data.map((i) => i.interest_value));
    });
    fetchResumeSignals(user.id).then((signals) => setResumeSignals(signals));
    // Fetch clubs the user has already applied to so we can exclude them from recommendations
    if (user.email) {
      supabase
        .from('applicants')
        .select('club_id')
        .eq('email', user.email)
        .then(({ data }) => {
          if (data) setAppliedClubIds(new Set(data.map((r: any) => r.club_id)));
        });
    }
  }, [user, fetchInterests, fetchResumeSignals]);

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
      const categoryBucketKey = normalizeText(club.categoryBucket || "");
      const categoryKey = normalizeText(club.category || "");
      const resolvedBucket = getFilterBucket(club.categoryBucket || "", club.category || "");
      const searchParts = [club.name, club.description].filter(
        (v): v is string => Boolean(v)
      );
      const searchKey = normalizeText(searchParts.join(" "));

      return { club, categoryBucketKey, categoryKey, resolvedBucket, searchKey };
    });
  }, [clubs]);

  // Filter clubs (deferred so typing stays responsive)
  const filteredClubs = useMemo(() => {
    const selectedCategoryKey =
      selectedCategory === "All" ? "" : normalizeText(selectedCategory);
    const query = normalizeText(deferredSearchText);
    const isGreekLifeFilter = selectedCategory === "Greek Life";

    return indexedClubs
      .filter(({ club, categoryBucketKey, categoryKey, resolvedBucket, searchKey }) => {
        let matchesCategory: boolean;
        if (selectedCategory === "All") {
          matchesCategory = true;
        } else if (isGreekLifeFilter) {
          matchesCategory = GREEK_LIFE_TERMS.some(
            (term) => categoryBucketKey.includes(term) || categoryKey.includes(term)
          );
        } else {
          matchesCategory = resolvedBucket === selectedCategoryKey;
        }

        // Search filter: name OR description contains query
        const matchesSearch = !query || searchKey.includes(query);

        // Recruiting filter
        const matchesRecruiting = !recruitingOnly || club.recruitingStatus === 'open';

        return matchesCategory && matchesSearch && matchesRecruiting;
      })
      .map(({ club }) => club);
  }, [deferredSearchText, indexedClubs, selectedCategory, recruitingOnly]);

  // Count clubs per category given current search + recruiting filter (but NOT the category filter)
  // so pills always show how many clubs you'll see if you click them.
  const categoryCounts = useMemo(() => {
    const query = normalizeText(deferredSearchText);
    const counts: Record<string, number> = {};

    for (const { categoryBucketKey, categoryKey, resolvedBucket, searchKey, club } of indexedClubs) {
      const matchesSearch = !query || searchKey.includes(query);
      const matchesRecruiting = !recruitingOnly || club.recruitingStatus === 'open';
      if (!matchesSearch || !matchesRecruiting) continue;

      counts['All'] = (counts['All'] ?? 0) + 1;

      for (const cat of CATEGORIES) {
        if (cat.label === 'All') continue;
        const catKey = normalizeText(cat.label);
        const isGl = cat.label === 'Greek Life';
        const matches = isGl
          ? GREEK_LIFE_TERMS.some((t) => categoryBucketKey.includes(t) || categoryKey.includes(t))
          : resolvedBucket === catKey;
        if (matches) counts[cat.label] = (counts[cat.label] ?? 0) + 1;
      }
    }

    return counts;
  }, [indexedClubs, deferredSearchText, recruitingOnly]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setRecruitingOnly(false);
  };

  const hasActiveFilters = searchText || selectedCategory !== "All" || recruitingOnly;

  // Match scores per club — blended if resume signals present
  const matchScores = useMemo(() => {
    if (!interestValues.length && !resumeSignals.length) return {} as Record<string, number>;
    const scores: Record<string, number> = {};
    for (const club of filteredClubs) {
      const score = calculateMatchScore(club, interestValues, resumeSignals);
      if (score > 0) scores[club.id] = score;
    }
    return scores;
  }, [filteredClubs, interestValues, resumeSignals]);

  // Top 5 recommended clubs with blended score ≥ 60, shown in the shelf above the list
  const recommendedClubs = useMemo(() => {
    if (!user || (!interestValues.length && !resumeSignals.length)) return [];
    return clubs
      .map((club) => ({
        club,
        score: calculateMatchScore(club, interestValues, resumeSignals),
        reason: getTopMatchTerm(club, interestValues, resumeSignals),
      }))
      .filter(({ score, club }) =>
        score >= 60 &&
        // Exclude clubs the student has already applied to
        !appliedClubIds.has(club.id) &&
        // When resume signals exist, at least one must directly match the club
        (resumeSignals.length === 0 || resumeHitsClub(club, resumeSignals))
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [clubs, interestValues, resumeSignals, user]);


  return (
    <main className="min-h-screen bg-[#0A0A0A] dark">
      <Helmet>
        <title>Discover University Clubs | UniCircle</title>
        <meta name="description" content="Explore hundreds of student clubs and organizations. Find the perfect club for your interests at UniCircle." />
        <meta property="og:title" content="Discover University Clubs | UniCircle" />
        <meta property="og:description" content="Explore hundreds of student clubs and organizations. Find your community on UniCircle." />
        <meta property="og:url" content="https://unicircle.app/clubs" />
        <meta property="og:type" content="website" />
      </Helmet>
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

      {/* Campus Social Search */}
      <section className="px-4 pb-2">
        <div className="max-w-6xl mx-auto">
          <CampusSearch clubs={clubs} events={[]} />
        </div>
      </section>

      {/* Category pills - horizontal scroll */}
      <section className="pb-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.label;
              const count = categoryCounts[cat.label] ?? 0;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.label}
                  onClick={() => setSelectedCategory(cat.label)}
                  style={isActive
                    ? { background: cat.color, color: '#000', borderColor: cat.color }
                    : { '--pill-hover': cat.color } as React.CSSProperties
                  }
                  className={`group shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap border ${
                    isActive
                      ? 'border-transparent'
                      : 'bg-transparent text-zinc-500 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {cat.label}
                  <span
                    className={`text-[10px] tabular-nums rounded-full px-1.5 py-0.5 ${
                      isActive
                        ? 'bg-black/20 text-black/70'
                        : 'bg-white/5 text-zinc-600 group-hover:bg-white/10 group-hover:text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recruiting filter toggle */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setRecruitingOnly((v) => !v)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                recruitingOnly
                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                  : 'bg-transparent text-zinc-500 border-white/10 hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${recruitingOnly ? 'bg-green-400' : 'bg-zinc-600'}`} />
              Recruiting Now
            </button>
          </div>
        </div>
      </section>

      {/* Recommended shelf — only shown to authenticated users with signals and qualifying matches */}
      {recommendedClubs.length > 0 && (
        <section className="pb-6 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-white">Recommended for You</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {recommendedClubs.map(({ club, reason }) => (
                <div key={club.id} className="shrink-0 w-72">
                  <ClubCard
                    club={club}
                    isSaved={isSaved(club.id)}
                    onToggleSave={handleToggleSave}
                    matchScore={matchScores[club.id]}
                    reason={reason ?? undefined}

                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
                          matchScore={matchScores[club.id]}

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
                    No clubs found
                  </h3>
                  <p className="text-zinc-500 mb-5">
                    {selectedCategory !== 'All'
                      ? `No results in "${selectedCategory}"${searchText ? ` for "${searchText}"` : ''}`
                      : `Nothing matched "${searchText}"`}
                  </p>
                  {/* Suggest categories that do have results */}
                  {(() => {
                    const suggestions = CATEGORIES.filter(
                      (c) => c.label !== 'All' && c.label !== selectedCategory && (categoryCounts[c.label] ?? 0) > 0
                    ).slice(0, 4);
                    return suggestions.length > 0 ? (
                      <div className="mb-6">
                        <p className="text-xs text-zinc-600 mb-3">Try one of these instead</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {suggestions.map((cat) => {
                            const Icon = cat.icon;
                            return (
                              <button
                                key={cat.label}
                                onClick={() => { setSelectedCategory(cat.label); setSearchText(""); }}
                                style={{ borderColor: `${cat.color}40`, color: cat.color }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-transparent hover:opacity-80 transition-opacity"
                              >
                                <Icon className="w-3 h-3" />
                                {cat.label}
                                <span className="text-[10px] opacity-60">{categoryCounts[cat.label]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null;
                  })()}
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


      <RecommendationChat clubs={clubs} />
    </main>
  );
};

export default ClubsDirectory;
