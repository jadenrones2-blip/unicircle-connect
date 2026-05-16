import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { dataClient } from '@/integrations/supabase/dataClient';
import type { Club, RecruitingStatus } from '@/data/mockData';

// ── transform (copied from useExternalDB) ────────────────────────────────────

const cleanText = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/( at)+$/i, '')
    .trim();

// Known typos in the CSI source data → correct spelling
const DB_NAME_CORRECTIONS: Record<string, string> = {
  'sororit': 'Sorority',
};

const cleanClubName = (name: string): string => {
  let s = cleanText(name);
  // Remove registry suffixes like "at UC San Diego" appended by CSI
  s = s.replace(/\s+at\s+UC\s+San\s+Diego.*$/i, '');
  s = s.replace(/\s+at\s+UCSD.*$/i, '');
  // Remove trailing lone parenthesized campus tag e.g. "(at UCSD)"
  s = s.replace(/\s*\(\s*at\s+[^)]+\)\s*$/i, '');
  s = s.trim();

  // Apply known DB typo corrections (full-name match, case-insensitive)
  const lower = s.toLowerCase();
  if (DB_NAME_CORRECTIONS[lower]) return DB_NAME_CORRECTIONS[lower];
  // Also catch cases where the typo is the first word e.g. "Sororit Xi"
  for (const [typo, correction] of Object.entries(DB_NAME_CORRECTIONS)) {
    if (lower.startsWith(typo + ' ')) {
      return correction + s.slice(typo.length);
    }
  }

  return s;
};

const transformClub = (record: Record<string, unknown>): Club => {
  const recruitingStatus: RecruitingStatus = 'closed';
  const category = cleanText(record.category);
  const categoryBucket = cleanText(record.category_bucket);
  const tags: string[] = [];
  if (category) tags.push(category);
  return {
    id: cleanText(record.id || ''),
    name: cleanClubName(String(record.name ?? '')),
    category,
    categoryBucket,
    description: cleanText(record.description),
    memberCount: 0,
    imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=300&fit=crop',
    tags,
    recruitingStatus,
    meetingSchedule: 'TBD',
    email: cleanText(record.email),
    instagram: cleanText(record.instagram),
    website: cleanText(record.website),
    cover_image: record.cover_image ? String(record.cover_image) : null,
    recruitingStatus: (record.recruitingStatus as RecruitingStatus) || recruitingStatus,
  } as Club & { cover_image: string | null };
};

// ── Enrichment type ───────────────────────────────────────────────────────────

export interface ClubEnrichment {
  club_id: string;
  one_liner: string | null;
  what_they_do: string | null;
  who_should_join: string | null;
  vibe: string | null;
  time_commitment: string | null;
  highlights: string[] | null;
  tags: string[] | null;
  instagram_photo_url: string | null;
}

// ── cache (survives re-renders, cleared only on hard reload) ─────────────────

let _cache: Club[] | null = null;
let _fetchPromise: Promise<Club[]> | null = null;
let _enrichmentCache: Record<string, ClubEnrichment> | null = null;

// ── context ──────────────────────────────────────────────────────────────────

interface ClubsContextValue {
  clubs: Club[];
  enrichments: Record<string, ClubEnrichment>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const ClubsContext = createContext<ClubsContextValue | null>(null);

export function ClubsProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<Club[]>(_cache || []);
  const [enrichments, setEnrichments] = useState<Record<string, ClubEnrichment>>(_enrichmentCache || {});
  const [loading, setLoading] = useState(_cache === null);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrichments = useCallback(async (clubIds: string[]) => {
    if (_enrichmentCache) {
      setEnrichments(_enrichmentCache);
      return;
    }
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await (supabase as any)
        .from('club_enrichments')
        .select('*')
        .in('club_id', clubIds.slice(0, 500));
      if (data) {
        const map: Record<string, ClubEnrichment> = {};
        for (const row of data) map[row.club_id] = row;
        _enrichmentCache = map;
        setEnrichments(map);
      }
    } catch { /* enrichments are non-critical — fail silently */ }
  }, []);

  const fetchClubs = useCallback(async (force = false) => {
    if (_cache && !force) {
      setClubs(_cache);
      setLoading(false);
      fetchEnrichments(_cache.map(c => c.id));
      return;
    }

    if (!_fetchPromise || force) {
      _fetchPromise = (async () => {
        const { data: records, error: dbError } = await dataClient
          .from('clubs')
          .select('id, name, category, category_bucket, description, email, instagram, website, cover_image, recruitingStatus')
          .order('name', { ascending: true })
          .limit(1000);

        if (dbError) throw new Error(dbError.message);
        const result = (records || []).map(transformClub);
        _cache = result;
        _fetchPromise = null;
        return result;
      })();
    }

    setLoading(true);
    setError(null);
    try {
      const result = await _fetchPromise!;
      setClubs(result);
      fetchEnrichments(result.map(c => c.id));
    } catch (err) {
      console.error('Error fetching clubs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clubs');
    } finally {
      setLoading(false);
    }
  }, [fetchEnrichments]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return (
    <ClubsContext.Provider value={{ clubs, enrichments, loading, error, refetch: () => fetchClubs(true) }}>
      {children}
    </ClubsContext.Provider>
  );
}

export function useClubsContext(): ClubsContextValue {
  const ctx = useContext(ClubsContext);
  if (!ctx) throw new Error('useClubsContext must be inside ClubsProvider');
  return ctx;
}

export function useClubEnrichment(clubId: string): ClubEnrichment | null {
  const { enrichments } = useClubsContext();
  return enrichments[clubId] ?? null;
}
