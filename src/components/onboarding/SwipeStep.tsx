import { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, Loader2, CheckCircle } from 'lucide-react';
import { dataClient } from '@/integrations/supabase/dataClient';
import { supabase } from '@/integrations/supabase/client';
import { calculateMatchScore } from '@/lib/clubRecommendations';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Club } from '@/data/mockData';

const CATEGORY_COLORS: Record<string, string> = {
  academic: '#60a5fa',
  cultural: '#fb923c',
  'greek life': '#c084fc',
  professional: '#818cf8',
  service: '#34d399',
  social: '#f472b6',
  spiritual: '#2dd4bf',
  sports: '#f87171',
  'tech / stem': '#22d3ee',
};

function color(cat: string) {
  return CATEGORY_COLORS[cat?.toLowerCase().trim()] ?? 'hsl(43 74% 56%)';
}

interface Props {
  interests: string[];
  onDone: () => void;
}

function Card({
  club,
  isTop,
  offset,
  onLeft,
  onRight,
}: {
  club: Club;
  isTop: boolean;
  offset: number;
  onLeft: () => void;
  onRight: () => void;
}) {
  const c = color(club.categoryBucket || club.category || '');
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const saveOpacity = useTransform(x, [40, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-40, -120], [0, 1]);

  const onDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onRight();
    else if (info.offset.x < -100) onLeft();
  };

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - offset * 0.05,
        zIndex: 10 - offset,
        position: 'absolute',
        width: '100%',
        transformOrigin: 'bottom center',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      initial={{ scale: 1 - offset * 0.05, y: offset * 10 }}
      animate={{ scale: 1 - offset * 0.05, y: offset * 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div
        className="relative rounded-3xl overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.08)',
          height: 420,
          boxShadow: isTop ? '0 20px 60px rgba(0,0,0,0.6)' : undefined,
        }}
      >
        {/* Color gradient header */}
        <div
          className="w-full flex items-end px-6 pb-5"
          style={{ height: 180, background: `linear-gradient(135deg, ${c}35 0%, ${c}10 100%)` }}
        >
          <span className="text-8xl font-black leading-none" style={{ color: `${c}45` }}>
            {club.name[0]}
          </span>
        </div>

        {/* Category pill */}
        <div className="absolute top-4 left-4">
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
            style={{ background: `${c}20`, border: `1px solid ${c}40`, color: c }}
          >
            {club.categoryBucket || club.category || 'Club'}
          </span>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white leading-tight line-clamp-2">{club.name}</h2>
          {club.description && (
            <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">{club.description}</p>
          )}
        </div>

        {/* Swipe overlays */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: saveOpacity }}
              className="absolute top-6 right-6 px-4 py-2 rounded-xl border-2 border-emerald-400 text-emerald-400 text-sm font-black tracking-widest uppercase rotate-[-12deg]"
            >
              Save
            </motion.div>
            <motion.div
              style={{ opacity: skipOpacity }}
              className="absolute top-6 left-6 px-4 py-2 rounded-xl border-2 border-red-400 text-red-400 text-sm font-black tracking-widest uppercase rotate-[12deg]"
            >
              Skip
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function SwipeStep({ interests, onDone }: Props) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    dataClient
      .from('clubs')
      .select('*')
      .limit(500)
      .then(({ data }) => {
        const all = (data || []) as Club[];
        // Score against interests and take top 10
        const scored = all
          .map((c) => ({ club: c, score: calculateMatchScore(c, interests) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map((s) => s.club);
        setClubs(scored);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [interests]);

  const visible = clubs.slice(index, index + 3);
  const finished = index >= clubs.length;

  const saveClub = useCallback(
    async (club: Club) => {
      if (!user) return;
      try {
        await (supabase as any).from('saved_clubs').upsert(
          {
            user_id: user.id,
            club_id: club.id,
          },
          { onConflict: 'user_id,club_id' }
        );
        setSaved((s) => s + 1);
      } catch {
        /* non-fatal */
      }
    },
    [user]
  );

  const handleRight = useCallback(() => {
    if (visible[0]) saveClub(visible[0]);
    setIndex((i) => i + 1);
  }, [visible, saveClub]);

  const handleLeft = useCallback(() => {
    setIndex((i) => i + 1);
  }, []);

  const handleDone = () => {
    setDone(true);
    setTimeout(onDone, 800);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
        <p className="text-sm text-zinc-500">Finding your matches…</p>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-[500px] gap-4 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-display font-bold text-white">You're all set.</h3>
        <p className="text-zinc-500 text-sm">
          {saved > 0 ? `Saved ${saved} club${saved > 1 ? 's' : ''}. ` : ''}
          Taking you to your dashboard…
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center mb-2">
        <span className="text-xs font-bold tracking-widest uppercase text-zinc-600 mb-2 block">
          Step 6 of 6
        </span>
        <h2 className="text-2xl font-display font-bold text-white mb-1">Your top matches</h2>
        <p className="text-sm text-zinc-500">Swipe right to save · left to skip</p>
      </div>

      {/* Card stack */}
      <div className="relative w-full" style={{ maxWidth: 340, height: 420 }}>
        <AnimatePresence>
          {finished ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/10"
            >
              <p className="text-zinc-600 text-sm">That's all your matches</p>
            </motion.div>
          ) : (
            [...visible]
              .reverse()
              .map((club, i) => (
                <Card
                  key={club.id}
                  club={club}
                  isTop={i === visible.length - 1}
                  offset={visible.length - 1 - i}
                  onLeft={handleLeft}
                  onRight={handleRight}
                />
              ))
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {clubs.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              background:
                i < index ? 'hsl(43 74% 56%)' : i === index ? '#fff' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        {!finished && (
          <>
            <button
              onClick={handleLeft}
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={handleRight}
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
            >
              <Heart className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      <button
        onClick={handleDone}
        className="text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {finished ? 'Continue to Dashboard →' : 'Skip for now →'}
      </button>

      {saved > 0 && (
        <p className="text-xs text-emerald-400 font-medium">
          {saved} club{saved > 1 ? 's' : ''} saved ✓
        </p>
      )}
    </div>
  );
}
