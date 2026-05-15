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
  corrected_title: string | null;
  corrected_start_time: string | null;
  corrected_end_time: string | null;
  corrected_location: string | null;
  caption: string | null;
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
      // Score all clubs against student interests — threshold 20 to cast a wide net
      // (threshold 40 was too aggressive when a student has 4+ interests)
      const scored = clubs
        .map(club => ({
          club,
          score: calculateMatchScore(club, interestValues, resumeSignals),
        }))
        .filter(c => c.score >= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30); // top 30 matching clubs

      if (scored.length === 0) { setEvents([]); setLoading(false); return; }

      const clubIds = scored.map(c => c.club.id);

      // Extract Instagram handles for the secondary query
      const clubHandles = scored
        .map(c => {
          const ig = c.club.instagram;
          if (!ig) return null;
          const m = ig.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
          return m ? m[1].toLowerCase() : null;
        })
        .filter(Boolean) as string[];

      const now = new Date().toISOString();
      const eventFields = 'id, title, description, start_time, end_time, location, club_id, club_handle, source, source_url, verified, corrected_title, corrected_start_time, corrected_end_time, corrected_location, caption';

      // Fetch upcoming events for those clubs from external DB
      const { data, error: dbError } = await (dataClient as any)
        .from('events')
        .select(eventFields)
        .gte('start_time', now)
        .eq('verified', true)
        .in('club_id', clubIds)
        .order('start_time', { ascending: true })
        .limit(50);

      if (dbError) throw dbError;

      // Also fetch by club_handle (Instagram handle) for events scraped via IG
      const { data: handleData } = await (dataClient as any)
        .from('events')
        .select(eventFields)
        .gte('start_time', now)
        .eq('verified', true)
        .in('club_handle', clubHandles.length ? clubHandles : ['__none__'])
        .order('start_time', { ascending: true })
        .limit(50);

      // Merge and deduplicate
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const ev of [...(data || []), ...(handleData || [])]) {
        if (!seen.has(ev.id)) { seen.add(ev.id); merged.push(ev); }
      }

      // Build lookup keyed by both club_id and instagram handle
      const clubScoreMap: Record<string, { score: number; name: string }> = {};
      for (const { club, score } of scored) {
        clubScoreMap[club.id] = { score, name: club.name };
        const ig = club.instagram;
        if (ig) {
          const m = ig.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
          if (m) clubScoreMap[m[1].toLowerCase()] = { score, name: club.name };
        }
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
