import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateMatchScore } from '@/lib/clubRecommendations';
import type { Club } from '@/data/mockData';
import type { ClubEnrichment } from '@/contexts/ClubsContext';

export interface AIMatchResult {
  score: number;
  reason: string;
  source: 'ai' | 'cluster'; // where the score came from
}

const CACHE_KEY = 'unicircle_ai_matches';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  userId: string;
  ts: number;
  scores: Record<string, AIMatchResult>;
}

function loadCache(userId: string): Record<string, AIMatchResult> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.userId !== userId) return null;
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.scores;
  } catch { return null; }
}

function saveCache(userId: string, scores: Record<string, AIMatchResult>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, ts: Date.now(), scores }));
  } catch { /* storage full */ }
}

export function clearAIMatchCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

/**
 * Fetches AI-powered match scores for the top clubs.
 * Flow:
 * 1. Instantly returns cluster scores for ALL clubs (fast, local)
 * 2. Fires Claude in background to re-score the top 30 by cluster
 * 3. Merges AI scores back in — components re-render with better scores
 * 4. Caches per-user for 1 hour in localStorage
 */
export function useAIMatching(
  clubs: Club[],
  enrichments: Record<string, ClubEnrichment>,
  interestValues: string[],
  resumeKeywords: string[],
  userId: string | null,
) {
  const [aiScores, setAiScores] = useState<Record<string, AIMatchResult>>({});
  const [loading, setLoading] = useState(false);

  const runAIMatching = useCallback(async () => {
    if (!userId || !clubs.length || (!interestValues.length && !resumeKeywords.length)) return;

    // Check cache first
    const cached = loadCache(userId);
    if (cached) { setAiScores(cached); return; }

    setLoading(true);

    try {
      // Step 1: cluster-score all clubs, take top 30
      const withCluster = clubs
        .map(club => ({
          club,
          clusterScore: calculateMatchScore(club, interestValues, resumeKeywords),
        }))
        .filter(({ clusterScore }) => clusterScore > 0)
        .sort((a, b) => b.clusterScore - a.clusterScore)
        .slice(0, 30);

      if (!withCluster.length) { setLoading(false); return; }

      // Step 2: fetch major from profile
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('major')
        .eq('user_id', userId)
        .maybeSingle();
      const major = profileData?.major ?? null;

      // Step 3: separate interests by type
      const CAREER_KEYS = new Set(['tech_career', 'finance_career', 'startup_career', 'consulting_career', 'healthcare_career', 'research_career', 'creative_career', 'nonprofit_career', 'law_career', 'marketing_career', 'education_career', 'government_career']);
      const careerGoals = interestValues.filter(v => CAREER_KEYS.has(v));
      const interests = interestValues.filter(v => !CAREER_KEYS.has(v));

      // Step 4: build club payload with enrichment
      const clubPayload = withCluster.map(({ club }) => ({
        id: club.id,
        name: club.name,
        category: club.categoryBucket || club.category || '',
        one_liner: enrichments[club.id]?.one_liner ?? null,
        who_should_join: enrichments[club.id]?.who_should_join ?? null,
        what_they_do: enrichments[club.id]?.what_they_do ?? null,
        vibe: enrichments[club.id]?.vibe ?? null,
        tags: enrichments[club.id]?.tags ?? null,
      }));

      // Step 5: call edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) { setLoading(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-match-clubs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            student: { major, careerGoals, interests, resumeKeywords },
            clubs: clubPayload,
          }),
        }
      );

      if (!res.ok) { setLoading(false); return; }
      const { results } = await res.json();

      // Step 6: build score map, merge with cluster scores for non-AI clubs
      const scores: Record<string, AIMatchResult> = {};
      for (const r of results ?? []) {
        if (r?.id && typeof r.score === 'number') {
          scores[r.id] = { score: r.score, reason: r.reason ?? '', source: 'ai' };
        }
      }

      saveCache(userId, scores);
      setAiScores(scores);
    } catch (err) {
      console.error('AI matching failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, clubs, enrichments, interestValues, resumeKeywords]);

  useEffect(() => {
    runAIMatching();
  }, [runAIMatching]);

  /**
   * Get the best available score for a club.
   * Returns AI score if available, otherwise cluster score.
   */
  const getScore = useCallback((clubId: string): AIMatchResult | null => {
    if (aiScores[clubId]) return aiScores[clubId];
    const clusterScore = calculateMatchScore(
      clubs.find(c => c.id === clubId) as Club,
      interestValues,
      resumeKeywords,
    );
    if (clusterScore > 0) return { score: clusterScore, reason: '', source: 'cluster' };
    return null;
  }, [aiScores, clubs, interestValues, resumeKeywords]);

  return { aiScores, loading, getScore, refresh: () => { clearAIMatchCache(); runAIMatching(); } };
}
