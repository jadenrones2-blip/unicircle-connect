import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, ArrowRight, Calendar, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Club } from '@/data/mockData';

interface SearchResult {
  clubs: { id: string; reason: string }[];
  events: { id: string; reason: string }[];
  summary: string;
}

interface Props {
  clubs: Club[];
  events: any[];
}

const SUGGESTIONS = [
  'clubs with free food this week',
  'engineering clubs recruiting now',
  "what's happening Thursday afternoon",
  'business clubs for freshmen',
  'creative clubs with no experience needed',
];

export default function CampusSearch({ clubs, events }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoading(true);
      setResults(null);
      try {
        const { data, error } = await supabase.functions.invoke('campus-search', {
          body: { query: q, clubs, events },
        });
        if (!error && data) setResults(data as SearchResult);
      } catch {
        /* silent */
      }
      setLoading(false);
    },
    [clubs, events]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) search(query);
  };

  const clear = () => {
    setQuery('');
    setResults(null);
  };

  // Map result IDs back to full objects
  const matchedClubs =
    results?.clubs
      .map((r) => ({ club: clubs.find((c) => c.id === r.id), reason: r.reason }))
      .filter((r) => r.club) ?? [];

  const matchedEvents =
    results?.events
      .map((r) => ({ event: events.find((e) => e.id === r.id), reason: r.reason }))
      .filter((r) => r.event) ?? [];

  return (
    <div className="mb-8">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all"
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderColor: open ? 'rgba(196,150,28,0.4)' : 'rgba(255,255,255,0.08)',
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder='Ask anything — "clubs recruiting now", "free food this week"…'
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-all disabled:opacity-40"
          >
            Search <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Suggestion pills — show when focused + no results yet */}
        <AnimatePresence>
          {open && !results && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute top-full left-0 right-0 mt-2 p-3 rounded-xl border border-white/[0.07] bg-zinc-950 z-20 shadow-xl"
            >
              <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest mb-2">
                Try asking
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => {
                      setQuery(s);
                      search(s);
                    }}
                    className="text-xs text-zinc-400 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1.5 hover:text-white hover:border-white/15 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-5"
          >
            {results.summary && <p className="text-sm text-zinc-400 italic">"{results.summary}"</p>}

            {/* Club results */}
            {matchedClubs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                    Clubs
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchedClubs.map(({ club, reason }) => (
                    <Link
                      key={club!.id}
                      to={`/clubs/${club!.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-900 hover:border-white/10 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-xs font-black text-gold">
                        {club!.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white">
                          {club!.name}
                        </p>
                        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mt-0.5">
                          {reason}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Event results */}
            {matchedEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                    Events
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {matchedEvents.map(({ event, reason }) => {
                    const d = event.start_time
                      ? new Date(event.start_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : null;
                    return (
                      <Link
                        key={event.id}
                        to="/events"
                        className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-900 hover:border-white/10 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-100 truncate">
                              {event.corrected_title || event.title}
                            </p>
                            {d && <span className="text-[10px] text-zinc-600 shrink-0">{d}</span>}
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mt-0.5">
                            {reason}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {matchedClubs.length === 0 && matchedEvents.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-4">
                No matches found — try rephrasing your search.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
