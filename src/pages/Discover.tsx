import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, X, ArrowUp, Undo2, Loader2, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import { useClubs } from '@/hooks/useExternalDB';
import { useAuth } from '@/hooks/useAuth';
import { useSavedClubs } from '@/hooks/useSavedClubs';
import { useClubEnrichment, useClubsContext } from '@/contexts/ClubsContext';
import { useUserInterests } from '@/hooks/useUserInterests';
import { calculateMatchScore } from '@/lib/clubRecommendations';
import { toast } from 'sonner';
import type { Club } from '@/data/mockData';

const SKIP_KEY = 'unicircle_discover_skipped';

function getSkipped(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SKIP_KEY) ?? '[]')); }
  catch { return new Set(); }
}

function addSkipped(id: string) {
  const s = getSkipped(); s.add(id);
  localStorage.setItem(SKIP_KEY, JSON.stringify([...s]));
}

function removeSkipped(id: string) {
  const s = getSkipped(); s.delete(id);
  localStorage.setItem(SKIP_KEY, JSON.stringify([...s]));
}

const CATEGORY_COLORS: Record<string, string> = {
  academic: '#60a5fa', cultural: '#fb923c', fraternity: '#a78bfa',
  'greek life': '#c084fc', professional: '#818cf8', service: '#34d399',
  social: '#f472b6', sorority: '#fb7185', spiritual: '#2dd4bf',
  sports: '#f87171', 'tech / stem': '#22d3ee', tech: '#22d3ee',
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase().trim()] ?? 'hsl(43 74% 56%)';
}

// ── Single swipeable card ─────────────────────────────────────────────────────

function SwipeCard({
  club, isTop, offset,
  onSwipeLeft, onSwipeRight, onSwipeUp,
}: {
  club: Club; isTop: boolean; offset: number;
  onSwipeLeft: () => void; onSwipeRight: () => void; onSwipeUp: () => void;
}) {
  const enrichment = useClubEnrichment(club.id);
  const photo = enrichment?.instagram_photo_url ?? (club as any).cover_image;
  const categoryColor = getCategoryColor(club.categoryBucket || club.category || '');

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const saveOpacity  = useTransform(x, [40, 130], [0, 1]);
  const skipOpacity  = useTransform(x, [-40, -130], [0, 1]);
  const viewOpacity  = useTransform(y, [-40, -130], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    const { offset: off } = info;
    if (off.x > 110) onSwipeRight();
    else if (off.x < -110) onSwipeLeft();
    else if (off.y < -110) onSwipeUp();
  };

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - offset * 0.06,
        zIndex: 10 - offset,
        position: 'absolute',
        width: '100%',
        transformOrigin: 'bottom center',
      }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 1 - offset * 0.06, y: offset * 12 }}
      animate={{ scale: 1 - offset * 0.06, y: offset * 12 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div
        className="relative rounded-3xl overflow-hidden select-none"
        style={{
          background: '#111',
          border: `1px solid rgba(255,255,255,0.08)`,
          height: 480,
          boxShadow: isTop ? '0 24px 64px rgba(0,0,0,0.6)' : undefined,
        }}
      >
        {/* Photo or gradient header */}
        {photo ? (
          <img
            src={photo}
            alt={club.name}
            className="w-full object-cover"
            style={{ height: 220 }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full flex items-end p-6"
            style={{
              height: 220,
              background: `linear-gradient(135deg, ${categoryColor}30 0%, ${categoryColor}08 100%)`,
            }}
          >
            <span
              className="text-7xl font-black leading-none"
              style={{ color: `${categoryColor}50` }}
            >
              {club.name[0]}
            </span>
          </div>
        )}

        {/* Gradient overlay on photo */}
        {photo && (
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              height: 220,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(17,17,17,0.8) 100%)',
            }}
          />
        )}

        {/* Category pill */}
        <div className="absolute top-4 left-4">
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
            style={{
              background: `${categoryColor}20`,
              border: `1px solid ${categoryColor}40`,
              color: categoryColor,
            }}
          >
            {club.categoryBucket || club.category || 'Club'}
          </span>
        </div>

        {/* Card body */}
        <div className="p-5 flex flex-col gap-3" style={{ height: 260 }}>
          <h2 className="text-xl font-bold text-white leading-tight line-clamp-2">{club.name}</h2>

          {enrichment?.one_liner ? (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{enrichment.one_liner}</p>
          ) : club.description ? (
            <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">{club.description}</p>
          ) : null}

          {/* Vibe tags */}
          {enrichment?.vibe && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {enrichment.vibe.split(',').map(v => v.trim()).filter(Boolean).map((v, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: `${categoryColor}15`,
                    border: `1px solid ${categoryColor}30`,
                    color: categoryColor,
                  }}
                >
                  {v}
                </span>
              ))}
              {enrichment.time_commitment && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-medium">
                  {enrichment.time_commitment} commitment
                </span>
              )}
            </div>
          )}
        </div>

        {/* Swipe overlays — only on top card */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: saveOpacity }}
              className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none"
            >
              <div className="border-4 border-emerald-400 rounded-2xl px-6 py-3 rotate-[-15deg]">
                <span className="text-emerald-400 font-black text-3xl tracking-wider">SAVE</span>
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: skipOpacity }}
              className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none"
            >
              <div className="border-4 border-red-400 rounded-2xl px-6 py-3 rotate-[15deg]">
                <span className="text-red-400 font-black text-3xl tracking-wider">SKIP</span>
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: viewOpacity }}
              className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none"
            >
              <div className="border-4 border-gold rounded-2xl px-6 py-3">
                <span className="text-gold font-black text-3xl tracking-wider">VIEW</span>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Discover page ─────────────────────────────────────────────────────────────

export default function Discover() {
  const navigate = useNavigate();
  const { data: clubs, loading } = useClubs();
  const { enrichments } = useClubsContext();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/discover');
  }, [user, authLoading, navigate]);
  const { savedClubs, saveClub, unsaveClub, isSaved, fetchSavedClubs } = useSavedClubs();
  const { fetchInterests } = useUserInterests();
  const [interestValues, setInterestValues] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(getSkipped);
  const [lastSkipped, setLastSkipped] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // Load user data
  useState(() => {
    if (user) {
      fetchSavedClubs(user.id);
      fetchInterests(user.id).then(d => {
        if (d) setInterestValues(d.map(i => i.interest_value));
      });
    }
  });

  // Sort clubs by match score, exclude already saved + skipped
  const deck = useMemo(() => {
    const savedIds = new Set(savedClubs.map(s => s.club_id));
    return clubs
      .filter(c => !savedIds.has(c.id) && !skipped.has(c.id))
      .sort((a, b) => {
        const sa = calculateMatchScore(a, interestValues, []);
        const sb = calculateMatchScore(b, interestValues, []);
        return sb - sa;
      });
  }, [clubs, savedClubs, skipped, interestValues]);

  const current = deck[0];
  const next    = deck[1];
  const third   = deck[2];

  const handleSkip = () => {
    if (!current) return;
    addSkipped(current.id);
    setLastSkipped(current.id);
    setSkipped(getSkipped());
  };

  const handleSave = async () => {
    if (!current || !user) {
      if (!user) toast.error('Log in to save clubs');
      return;
    }
    await saveClub(user.id, current.id, current.name);
    setSavedCount(c => c + 1);
    setLastSkipped(null);
    // Advance deck by marking as "seen" (add to skipped temporarily)
    addSkipped(current.id);
    setSkipped(getSkipped());
    toast.success(`Saved ${current.name}!`);
  };

  const handleView = () => {
    if (!current) return;
    navigate(`/clubs/${current.id}`);
  };

  const handleUndo = () => {
    if (!lastSkipped) return;
    removeSkipped(lastSkipped);
    setSkipped(getSkipped());
    setLastSkipped(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] dark">
      <Header />

      <div className="flex flex-col items-center justify-start pt-20 pb-10 px-4 min-h-screen">
        {/* Header */}
        <div className="text-center mb-6 mt-4">
          <h1 className="text-2xl font-display font-bold text-white">Discover Clubs</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {deck.length > 0 ? `${deck.length} clubs left` : 'All caught up'}
            {savedCount > 0 && <span className="text-gold ml-2">· {savedCount} saved</span>}
          </p>
        </div>

        {/* Card stack */}
        <div className="relative w-full max-w-sm" style={{ height: 480 }}>
          <AnimatePresence>
            {deck.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/60 gap-4"
              >
                <CheckCircle className="w-12 h-12 text-gold" />
                <p className="text-white font-bold text-lg">You've seen them all</p>
                <p className="text-zinc-500 text-sm text-center max-w-xs">
                  Check your saved clubs or browse the full directory
                </p>
                <Link
                  to="/clubs"
                  className="mt-2 px-6 py-2.5 rounded-full bg-gold text-zinc-900 font-semibold text-sm"
                >
                  Browse all clubs
                </Link>
              </motion.div>
            ) : (
              <>
                {third && <SwipeCard key={third.id} club={third} isTop={false} offset={2} onSwipeLeft={handleSkip} onSwipeRight={handleSave} onSwipeUp={handleView} />}
                {next  && <SwipeCard key={next.id}  club={next}  isTop={false} offset={1} onSwipeLeft={handleSkip} onSwipeRight={handleSave} onSwipeUp={handleView} />}
                {current && (
                  <SwipeCard
                    key={current.id}
                    club={current}
                    isTop
                    offset={0}
                    onSwipeLeft={handleSkip}
                    onSwipeRight={handleSave}
                    onSwipeUp={handleView}
                  />
                )}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        {deck.length > 0 && (
          <div className="flex items-center gap-5 mt-8">
            <button
              onClick={handleSkip}
              className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition-all shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>

            {lastSkipped && (
              <button
                onClick={handleUndo}
                className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleView}
              className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-gold hover:border-gold/40 hover:bg-gold/10 transition-all shadow-lg"
            >
              <ArrowUp className="w-5 h-5" />
            </button>

            <button
              onClick={handleSave}
              className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-400 hover:border-emerald-400/40 hover:bg-emerald-400/10 transition-all shadow-lg"
            >
              <Heart className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Swipe hint */}
        {deck.length > 0 && (
          <p className="text-xs text-zinc-700 mt-5 text-center">
            ← skip &nbsp;·&nbsp; ↑ view &nbsp;·&nbsp; save →
          </p>
        )}
      </div>
    </main>
  );
}
