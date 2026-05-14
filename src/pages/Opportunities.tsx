import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ExternalLink, Clock, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { dataClient as supabase } from "@/integrations/supabase/dataClient";

interface Opportunity {
  id: string;
  club_id: string;
  club_name: string | null;
  title: string;
  description: string | null;
  type: string;
  deadline: string | null;
  link: string | null;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  position: '#60a5fa',
  internship: '#a78bfa',
  research: '#2dd4bf',
  volunteer: '#34d399',
  other: '#71717a',
};

const TYPES = ['All', 'Position', 'Internship', 'Research', 'Volunteer', 'Other'];

function formatDeadline(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('All');

  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('opportunities')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });
        setOpportunities((data as Opportunity[]) ?? []);
      } catch {
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunities();
  }, []);

  const filtered = useMemo(() => {
    if (selectedType === 'All') return opportunities;
    return opportunities.filter((o) => o.type === selectedType.toLowerCase());
  }, [opportunities, selectedType]);

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      <Header />

      {/* Hero */}
      <section className="pt-28 pb-6 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[0.22em] uppercase text-zinc-600 mb-2">
            UC San Diego
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight mb-2">
            Opportunities
          </h1>
          <p className="text-zinc-500 mb-6">
            Internships, positions, research, and volunteer openings from UCSD clubs
          </p>
        </div>
      </section>

      {/* Type filter pills */}
      <section className="pb-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {TYPES.map((type) => {
              const isActive = selectedType === type;
              const color = TYPE_COLORS[type.toLowerCase()] ?? 'hsl(43 74% 56%)';
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap"
                  style={
                    isActive
                      ? { background: color, color: '#000', border: `1px solid ${color}` }
                      : { background: 'transparent', color: '#71717a', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {type}
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
              <p className="text-zinc-500">Loading opportunities...</p>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-display font-semibold text-white mb-2">
                No opportunities yet
              </h3>
              <p className="text-zinc-500">
                Check back soon — clubs will post openings here.
              </p>
            </motion.div>
          ) : (
            <>
              <p className="text-xs text-zinc-600 mb-5">{filtered.length} opportunities</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedType}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                >
                  {filtered.map((opp, i) => {
                    const typeColor = TYPE_COLORS[opp.type] ?? '#71717a';
                    return (
                      <motion.div
                        key={opp.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35 }}
                      >
                        <div
                          className="flex flex-col h-full rounded-2xl overflow-hidden"
                          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <div className="h-[2px] w-full" style={{ background: typeColor }} />
                          <div className="flex flex-col flex-1 p-5">
                            {/* Type + club row */}
                            <div className="flex items-center justify-between mb-3">
                              <span
                                className="text-[10px] font-semibold tracking-[0.15em] uppercase"
                                style={{ color: typeColor }}
                              >
                                {opp.type}
                              </span>
                              {opp.club_name && (
                                <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                                  {opp.club_name}
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="font-display text-base font-bold text-white leading-tight mb-2 line-clamp-2">
                              {opp.title}
                            </h3>

                            {/* Description */}
                            {opp.description ? (
                              <p className="text-xs text-zinc-500 line-clamp-3 flex-1 mb-4 leading-relaxed">
                                {opp.description}
                              </p>
                            ) : (
                              <div className="flex-1 mb-4" />
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-auto">
                              <span className="flex items-center gap-1 text-[11px] text-zinc-600">
                                <Clock className="w-3 h-3" />
                                {opp.deadline ? `Due ${formatDeadline(opp.deadline)}` : 'No deadline'}
                              </span>
                              {opp.link && (
                                <a
                                  href={opp.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-gold hover:text-gold/80 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Apply
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Opportunities;
