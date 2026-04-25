import { useState, useEffect, useCallback } from 'react';
import { dataClient } from '@/integrations/supabase/dataClient';
import { calculateMatchScore } from '@/lib/clubRecommendations';
import type { Club } from '@/data/mockData';

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  club_id: string | null;
  club_handle: string | null;
  club_name?: string;
  source: string | null;
  source_url: string | null;
  verified: boolean | null;
  matchScore: number;
  isNative: boolean;
}

export function useClubMatchedEvents(
  clubs: Club[],
  interestValues: string[],
  resumeSignals: string[],
  limit = 6
) {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!clubs.length) return;
    setLoading(true);
    setError(null);

    try {
      // Score all clubs against student interests
      const scored = clubs
        .map(club => ({
          club,
          score: calculateMatchScore(club, interestValues, resumeSignals),
        }))
        .filter(c => c.score >= 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // top 20 matching clubs

      if (scored.length === 0) { setEvents([]); setLoading(false); return; }

      const clubIds = scored.map(c => c.club.id);
      const clubHandles = scored.map(c => c.club.id); // club_handle matches club.id

      const now = new Date().toISOString();

      // Fetch upcoming events for those clubs from external DB
      const { data, error: dbError } = await (dataClient as any)
        .from('events')
        .select('id, title, description, start_time, end_time, location, club_id, club_handle, source, source_url, verified')
        .gte('start_time', now)
        .eq('verified', true)
        .in('club_id', clubIds)
        .order('start_time', { ascending: true })
        .limit(50);

      if (dbError) throw dbError;

      // Also fetch by club_handle in case club_id is stored differently
      const { data: handleData } = await (dataClient as any)
        .from('events')
        .select('id, title, description, start_time, end_time, location, club_id, club_handle, source, source_url, verified')
        .gte('start_time', now)
        .eq('verified', true)
        .in('club_handle', clubHandles)
        .order('start_time', { ascending: true })
        .limit(50);

      // Merge and deduplicate
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const ev of [...(data || []), ...(handleData || [])]) {
        if (!seen.has(ev.id)) { seen.add(ev.id); merged.push(ev); }
      }

      // Build a quick lookup: club_id/handle → match score and name
      const clubScoreMap: Record<string, { score: number; name: string }> = {};
      for (const { club, score } of scored) {
        clubScoreMap[club.id] = { score, name: club.name };
      }

      const withScores: ClubEvent[] = merged
        .map(ev => {
          const lookup = clubScoreMap[ev.club_id] ?? clubScoreMap[ev.club_handle] ?? { score: 0, name: '' };
          return {
            ...ev,
            club_name: lookup.name,
            matchScore: lookup.score,
            isNative: ev.source === 'native',
          };
        })
        .filter(ev => ev.matchScore > 0)
        .sort((a, b) => {
          // Sort: native first, then by match score, then by date
          if (a.isNative !== b.isNative) return a.isNative ? -1 : 1;
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        })
        .slice(0, limit);

      setEvents(withScores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch club events');
    } finally {
      setLoading(false);
    }
  }, [clubs, interestValues.join(','), resumeSignals.join(','), limit]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
