import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Slide { emoji: string; title: string; body: string; }
interface Spotlight { id: string; club_id: string; club_name: string; slides: Slide[]; }

export default function SpotlightCarousel() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [clubIndex, setClubIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    (supabase as any)
      .from('club_spotlights')
      .select('*')
      .eq('active', true)
      .order('updated_at', { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        if (data?.length) setSpotlights(data as Spotlight[]);
      })
      .catch(() => {});
  }, []);

  if (!spotlights.length) return null;

  const current = spotlights[clubIndex];
  const slides = current?.slides || [];
  const slide = slides[slideIndex] ?? slides[0];

  const prevClub = () => { setClubIndex(i => (i - 1 + spotlights.length) % spotlights.length); setSlideIndex(0); };
  const nextClub = () => { setClubIndex(i => (i + 1) % spotlights.length); setSlideIndex(0); };
  const prevSlide = () => setSlideIndex(i => Math.max(0, i - 1));
  const nextSlide = () => setSlideIndex(i => Math.min(slides.length - 1, i + 1));

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold" />
          <h2 className="font-display text-base font-bold text-white tracking-tight">Club Spotlights</h2>
        </div>
        {spotlights.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={prevClub} className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-zinc-600">{clubIndex + 1} / {spotlights.length}</span>
            <button onClick={nextClub} className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/5 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${clubIndex}-${slideIndex}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 overflow-hidden"
        >
          {/* Slide content */}
          <div className="p-6 flex gap-5">
            <div className="text-4xl flex-shrink-0 mt-1">{slide?.emoji || '✨'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">
                {current.club_name}
              </p>
              <h3 className="text-base font-bold text-white mb-1 leading-snug">{slide?.title}</h3>
              {slide?.body && <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{slide.body}</p>}
            </div>
          </div>

          {/* Footer: slide dots + view club */}
          <div className="px-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {slides.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={prevSlide} disabled={slideIndex === 0} className="p-0.5 text-zinc-700 hover:text-zinc-400 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex gap-1">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSlideIndex(i)}
                        className="w-1.5 h-1.5 rounded-full transition-all"
                        style={{ background: i === slideIndex ? 'hsl(43 74% 56%)' : 'rgba(255,255,255,0.15)' }}
                      />
                    ))}
                  </div>
                  <button onClick={nextSlide} disabled={slideIndex === slides.length - 1} className="p-0.5 text-zinc-700 hover:text-zinc-400 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <Link
              to={`/clubs/${current.club_id}`}
              className="text-xs font-semibold text-gold hover:text-gold/80 transition-colors"
            >
              View club →
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
