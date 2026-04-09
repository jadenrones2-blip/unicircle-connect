import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RecruitmentRequirement } from '@/hooks/useRecruitmentRequirements';

export interface CriterionScore {
  requirementId: string;
  score: number; // 1–5
  note: string;
}

export interface RubricScoreRow {
  id: string;
  applicant_id: string;
  officer_id: string;
  requirement_id: string;
  score: number;
  note: string | null;
}

// Returns { description, weight } from a requirement's value JSON
export function parseCriterionValue(req: RecruitmentRequirement): { description: string; weight: number } {
  const v = req.value as Record<string, unknown>;
  return {
    description: typeof v.description === 'string' ? v.description : '',
    weight: typeof v.weight === 'number' ? v.weight : 3,
  };
}

// Weighted score 0–100 from an officer's scores against rubric criteria
export function calcWeightedScore(
  scores: Record<string, CriterionScore>,
  criteria: RecruitmentRequirement[]
): number | null {
  const aiCriteria = criteria.filter((r) => r.type === 'ai');
  if (aiCriteria.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const req of aiCriteria) {
    const { weight } = parseCriterionValue(req);
    const entry = scores[req.id];
    if (entry?.score) {
      weightedSum += entry.score * weight;
    }
    totalWeight += 5 * weight; // max possible contribution
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100);
}

export function useRubricScoring(applicantId: string | null) {
  const { user } = useAuth();
  // scores keyed by requirementId
  const [scores, setScores] = useState<Record<string, CriterionScore>>({});
  // all officers' scores for this applicant (to compute team average)
  const [allScores, setAllScores] = useState<RubricScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // requirementId being saved

  const fetchScores = useCallback(async () => {
    if (!applicantId || !user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('officer_rubric_scores')
        .select('*')
        .eq('applicant_id', applicantId);

      if (error) throw error;

      const rows: RubricScoreRow[] = data || [];
      setAllScores(rows);

      // Build my scores map
      const mine: Record<string, CriterionScore> = {};
      for (const row of rows.filter((r: RubricScoreRow) => r.officer_id === user.id)) {
        mine[row.requirement_id] = {
          requirementId: row.requirement_id,
          score: row.score,
          note: row.note || '',
        };
      }
      setScores(mine);
    } catch {
      // Table may not exist yet — fail silently
    } finally {
      setLoading(false);
    }
  }, [applicantId, user]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const saveScore = async (requirementId: string, score: number, note: string) => {
    if (!applicantId || !user) return;
    setSaving(requirementId);

    // Optimistic update
    setScores((prev) => ({
      ...prev,
      [requirementId]: { requirementId, score, note },
    }));

    try {
      const { error } = await (supabase as any)
        .from('officer_rubric_scores')
        .upsert(
          {
            applicant_id: applicantId,
            officer_id: user.id,
            requirement_id: requirementId,
            score,
            note: note || null,
          },
          { onConflict: 'applicant_id,officer_id,requirement_id' }
        );
      if (error) throw error;
      // Refresh all scores for team average
      fetchScores();
    } catch {
      // Revert on failure — just re-fetch
      fetchScores();
    } finally {
      setSaving(null);
    }
  };

  // Team average score per criterion (all officers)
  function teamAvgForCriterion(requirementId: string): number | null {
    const rows = allScores.filter((r) => r.requirement_id === requirementId);
    if (rows.length === 0) return null;
    return Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length * 10) / 10;
  }

  return {
    scores,
    allScores,
    loading,
    saving,
    saveScore,
    teamAvgForCriterion,
    refetch: fetchScores,
  };
}
