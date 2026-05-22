import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ClubAdminSidebar } from '@/components/club-admin/ClubAdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Star, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const STAGES = ['applied', 'under_review', 'interview', 'accepted', 'rejected', 'member'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<Stage, string> = {
  applied: '#3b82f6',
  under_review: '#eab308',
  interview: '#a855f7',
  accepted: '#22c55e',
  rejected: '#ef4444',
  member: '#b8860b',
};

const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  under_review: 'Under Review',
  interview: 'Interview',
  accepted: 'Accepted',
  rejected: 'Rejected',
  member: 'Member',
};

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  year: string | null;
  major: string | null;
  stage: Stage;
  avg_score?: number | null;
}

export default function OrgPipeline() {
  const { clubId } = useParams<{ clubId: string }>();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const fetchPeople = async () => {
    if (!clubId) return;
    setLoading(true);

    const { data: peopleData, error } = await (supabase as any)
      .from('people')
      .select('*')
      .eq('organization_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load people');
      setLoading(false);
      return;
    }

    const ids = peopleData?.map((p: Person) => p.id) || [];
    const reviewMap: Record<string, number> = {};

    if (ids.length > 0) {
      const { data: reviews } = await (supabase as any)
        .from('reviews')
        .select('person_id, culture_fit, experience, involvement')
        .in('person_id', ids);

      if (reviews) {
        const grouped: Record<string, number[]> = {};
        reviews.forEach((r: any) => {
          const scores = [r.culture_fit, r.experience, r.involvement].filter(Boolean);
          if (scores.length) {
            if (!grouped[r.person_id]) grouped[r.person_id] = [];
            grouped[r.person_id].push(...scores);
          }
        });
        Object.entries(grouped).forEach(([pid, scores]) => {
          reviewMap[pid] = (scores as number[]).reduce((a, b) => a + b, 0) / scores.length;
        });
      }
    }

    setPeople(
      (peopleData || []).map((p: Person) => ({ ...p, avg_score: reviewMap[p.id] ?? null }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchPeople();
  }, [clubId]);

  const handleDragStart = (personId: string) => setDragging(personId);
  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  const handleDrop = async (stage: Stage) => {
    if (!dragging || !stage) return;
    const person = people.find((p) => p.id === dragging);
    if (!person || person.stage === stage) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    // Optimistic update
    setPeople((prev) => prev.map((p) => (p.id === dragging ? { ...p, stage } : p)));
    setDragging(null);
    setDragOver(null);

    const { error } = await (supabase as any).from('people').update({ stage }).eq('id', dragging);
    if (error) {
      toast.error('Failed to move person');
      fetchPeople(); // revert
    }
  };

  const byStage = (stage: Stage) => people.filter((p) => p.stage === stage);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: '#0A0A0A' }}>
        <ClubAdminSidebar />
        <main className="flex-1 p-6 overflow-hidden flex flex-col">
          <SidebarTrigger className="mb-4" />

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Pipeline</h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                Drag cards to move people between stages
              </p>
            </div>
            <Link to={`/club-admin/clubs/${clubId}/people`}>
              <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5">
                List View
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
              {STAGES.map((stage) => {
                const cards = byStage(stage);
                const color = STAGE_COLORS[stage];
                const isOver = dragOver === stage;

                return (
                  <div
                    key={stage}
                    className="flex-shrink-0 w-60 flex flex-col"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(stage);
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(stage)}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                          {STAGE_LABELS[stage]}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: color + '22', color }}
                      >
                        {cards.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div
                      className={`flex-1 rounded-xl p-2 space-y-2 transition-colors overflow-y-auto min-h-[120px] ${
                        isOver
                          ? 'bg-white/10 border border-dashed border-white/20'
                          : 'bg-white/[0.02] border border-white/5'
                      }`}
                    >
                      {cards.length === 0 && !isOver && (
                        <div className="flex items-center justify-center h-20 text-zinc-700 text-xs">
                          Drop here
                        </div>
                      )}
                      {cards.map((person) => (
                        <div
                          key={person.id}
                          draggable
                          onDragStart={() => handleDragStart(person.id)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-lg border border-white/8 bg-[#111] p-3 cursor-grab active:cursor-grabbing transition-all group ${
                            dragging === person.id ? 'opacity-40 scale-95' : 'hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {person.first_name} {person.last_name}
                              </p>
                              {(person.major || person.year) && (
                                <p className="text-xs text-zinc-500 truncate mt-0.5">
                                  {[person.major, person.year].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                            <Link
                              to={`/club-admin/clubs/${clubId}/people/${person.id}`}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>

                          {person.avg_score != null && (
                            <div className="mt-2 flex items-center gap-1">
                              <Star className="w-3 h-3 text-gold fill-gold" />
                              <span className="text-xs text-zinc-400">
                                {person.avg_score.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
