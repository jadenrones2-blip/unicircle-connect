import { useCallback, useEffect, useState } from "react";
import { dataClient } from "@/integrations/supabase/dataClient";

export type RecruitmentCycle = "fall" | "winter" | "spring" | "rolling" | "none";
export type RecruitmentStatus = "open" | "upcoming" | "closed";

export interface ExternalClubRecord {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  instagram: string | null;
  linkedin: string | null;
  website: string | null;
  cover_image: string | null;
  recruitingStatus: RecruitmentStatus | null;
  recruitment_cycle: RecruitmentCycle | null;
}

interface UseExternalClubRecordResult {
  club: ExternalClubRecord | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExternalClubRecord(clubId?: string): UseExternalClubRecordResult {
  const [club, setClub] = useState<ExternalClubRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClub = useCallback(async () => {
    if (!clubId) {
      setClub(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await dataClient
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .maybeSingle();

      if (dbError) {
        console.warn("Club not found:", clubId);
        setClub(null);
        return;
      }

      setClub(data as ExternalClubRecord | null);
    } catch (err) {
      console.error("Error fetching club by id:", err);
      setClub(null);
      setError(err instanceof Error ? err.message : "Failed to fetch club");
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  return { club, loading, error, refetch: fetchClub };
}
