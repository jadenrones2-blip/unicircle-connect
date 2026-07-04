import { useState, useEffect, useCallback } from 'react';
import { dataClient } from '@/integrations/supabase/dataClient';
import { extractClubKeywords } from '@/lib/clubRecommendations';
import type { Club } from '@/data/mockData';

// Re-exported for consumers that previously used ClubEvent
export interface RecommendedEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  club_id: string | null;
  club_handle: string | null;
  club_name: string;
  source: string | null;
  source_url: string | null;
  verified: boolean | null;
  corrected_title: string | null;
  corrected_start_time: string | null;
  corrected_end_time: string | null;
  corrected_location: string | null;
  caption: string | null;
  matchScore: number;
}

// Maps each interest quiz value to the semantic KEYWORD_CLUSTERS it belongs to.
// Must stay in sync with INTEREST_TO_CLUSTERS in clubRecommendations.ts.
const INTEREST_TO_CLUSTERS: Record<string, string[]> = {
  // Goals
  network: ['leadership', 'business', 'academic'],
  skills: ['academic', 'computer_science', 'engineering'],
  squad: [],
  confidence: ['leadership'],
  purpose: ['service', 'social_justice', 'sustainability'],
  fun: [],
  // Career goals (note: quiz stores WITHOUT trailing 's')
  tech_career: ['computer_science', 'engineering', 'math'],
  finance_career: ['finance', 'business'],
  startup_career: ['business'],
  consulting_career: ['consulting', 'business'],
  healthcare_career: ['healthcare'],
  research_career: ['academic', 'science'],
  creative_career: ['arts', 'writing', 'theater', 'music', 'dance', 'photography'],
  nonprofit_career: ['service', 'social_justice'],
  law_career: ['law'],
  marketing_career: ['marketing', 'business'],
  education_career: ['academic'],
  government_career: ['law', 'social_justice'],
  undecided_career: [],
  // Interest areas
  tech: ['computer_science', 'engineering'],
  business: ['business', 'finance', 'marketing', 'consulting'],
  arts: ['arts', 'theater', 'writing'],
  science: ['science', 'math', 'healthcare'],
  culture: ['cultural', 'asian', 'latinx', 'african', 'middle_eastern', 'lgbtq', 'international'],
  fitness: ['sports', 'fitness', 'outdoor', 'martial_arts'],
  social_impact: ['service', 'social_justice', 'sustainability'],
  gaming: ['gaming'],
  music: ['music'],
  dance: ['dance'],
  writing: ['writing'],
  investing: ['finance'],
  ai: ['computer_science'],
  film: ['theater', 'photography'],
  food: ['food'],
  travel: ['international'],
  sustainability: ['sustainability'],
  spiritual: ['spiritual'],
  // Vibe
  competitive: ['sports'],
  professional: ['leadership', 'business', 'academic'],
  creative_vibe: ['arts', 'writing', 'theater', 'music', 'dance', 'photography'],
  inclusive: ['cultural', 'lgbtq'],
  // Resume-extracted
  resume_career: [],
  resume_interests: [],
  resume_skills: [],
  resume_vibe: [],
};

function getUserClusters(interestValues: string[]): Set<string> {
  const clusters = new Set<string>();
  for (const val of interestValues) {
    const mapped = INTEREST_TO_CLUSTERS[val] ?? [];
    mapped.forEach((c) => clusters.add(c));
  }
  return clusters;
}

function scoreClub(club: Club, userClusters: Set<string>): number {
  if (userClusters.size === 0) return 0;
  const clubClusters = extractClubKeywords(club);
  let matches = 0;
  for (const c of userClusters) {
    if (clubClusters.has(c)) matches++;
  }
  if (matches === 0) return 0;
  const pct = (matches / userClusters.size) * 100;
  return Math.min(100, Math.round(pct + (matches >= 3 ? 12 : matches >= 2 ? 5 : 0)));
}

const EVENT_FIELDS =
  'id, title, start_time, end_time, location, club_id, club_handle, source, source_url, verified, corrected_title, corrected_start_time, corrected_end_time, corrected_location, caption';

/**
 * Single unified hook for recommended events.
 * Uses the same cluster-based interest matching as the club directory.
 * Does NOT filter by verified — most events aren't marked verified.
 */
export function useRecommendedEvents(clubs: Club[], interestValues: string[], limit = 8) {
  const [events, setEvents] = useState<RecommendedEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!clubs.length || !interestValues.length) {
      setEvents([]);
      return;
    }

    setLoading(true);

    try {
      const userClusters = getUserClusters(interestValues);

      // Score all clubs, take any that score >= 10 (wide net), cap at 40
      const scored = clubs
        .map((club) => ({ club, score: scoreClub(club, userClusters) }))
        .filter((c) => c.score >= 10)
        .sort((a, b) => b.score - a.score)
        .slice(0, 40);

      const _d = new Date();
      const now = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}T00:00:00`;

      const merged: any[] = [];

      if (scored.length > 0) {
        const clubIds = scored.map((c) => c.club.id);

        // Extract instagram handles for handle-based lookup
        const handles = scored
          .map((c) => {
            const ig = c.club.instagram;
            if (!ig) return null;
            const m = ig.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
            return m ? m[1].toLowerCase() : null;
          })
          .filter(Boolean) as string[];

        // Fetch by club_id — NO verified filter
        const [byId, byHandle] = await Promise.all([
          (dataClient as any)
            .from('events')
            .select(EVENT_FIELDS)
            .gte('start_time', now)
            .in('club_id', clubIds)
            .order('start_time', { ascending: true })
            .limit(80),
          handles.length
            ? (dataClient as any)
                .from('events')
                .select(EVENT_FIELDS)
                .gte('start_time', now)
                .in('club_handle', handles)
                .order('start_time', { ascending: true })
                .limit(80)
            : Promise.resolve({ data: [] }),
        ]);

        const seen = new Set<string>();
        for (const ev of [...(byId.data ?? []), ...(byHandle.data ?? [])]) {
          if (!seen.has(ev.id)) {
            seen.add(ev.id);
            merged.push(ev);
          }
        }
      }

      // Build lookup: club_id → { score, name }  AND  handle → { score, name }
      const lookup: Record<string, { score: number; name: string }> = {};
      for (const { club, score } of scored) {
        lookup[club.id] = { score, name: club.name };
        const ig = club.instagram;
        if (ig) {
          const m = ig.match(/(?:instagram\.com\/)?@?([A-Za-z0-9_.]+)\/?$/);
          if (m) lookup[m[1].toLowerCase()] = { score, name: club.name };
        }
      }

      // Also try matching by club_handle = club UUID (some scrapers store club IDs there)
      if (scored.length > 0) {
        const clubUuids = scored.map((c) => c.club.id);
        const { data: byUuid } = await (dataClient as any)
          .from('events')
          .select(EVENT_FIELDS)
          .gte('start_time', now)
          .in('club_handle', clubUuids)
          .order('start_time', { ascending: true })
          .limit(40);
        for (const ev of byUuid ?? []) {
          if (!merged.find((e) => e.id === ev.id)) merged.push(ev);
        }
      }

      // Keyword fallback — always runs to fill gaps, uses event title + club_handle name
      {
        const keywords = interestValues
          .flatMap((v) => INTEREST_TO_CLUSTERS[v] ?? [])
          .flatMap((cluster) => cluster.split('_'));
        // Also add scored club names as keywords for name-based matching
        const clubNameWords = scored
          .flatMap((c) => c.club.name.toLowerCase().split(/\s+/))
          .filter((w) => w.length > 4);
        const uniqueKw = [...new Set([...keywords, ...clubNameWords])].filter((k) => k.length > 3);

        if (uniqueKw.length > 0) {
          const { data: kwEvents } = await (dataClient as any)
            .from('events')
            .select(EVENT_FIELDS)
            .gte('start_time', now)
            .order('start_time', { ascending: true })
            .limit(300);

          for (const ev of kwEvents ?? []) {
            if (merged.find((e) => e.id === ev.id)) continue;
            const text = [ev.title, ev.corrected_title, ev.caption, ev.club_handle]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            if (uniqueKw.some((kw) => text.includes(kw))) {
              merged.push(ev);
            }
          }
        }
      }

      const result: RecommendedEvent[] = merged
        .map((ev) => {
          const info =
            lookup[ev.club_id] ??
            lookup[ev.club_handle] ?? { score: 5, name: ev.club_handle ?? '' };
          return { ...ev, club_name: info.name, matchScore: info.score };
        })
        .filter((ev) => !isErrorTitle(ev.corrected_title ?? ev.title))
        .sort(
          (a, b) =>
            b.matchScore - a.matchScore ||
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
        .slice(0, limit);

      setEvents(result);
    } catch (err) {
      console.error('useRecommendedEvents error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [clubs, interestValues.join(','), limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refetch: fetchEvents };
}

function isErrorTitle(title: string | null): boolean {
  if (!title) return false;
  return title.startsWith('{"') || title.startsWith('{\\\"') || title.includes('"error"');
}
