import { useCallback, useEffect, useState } from "react";

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
      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy`
      );

      url.searchParams.set("table", "clubs");
      url.searchParams.set("select", "*");
      url.searchParams.set("limit", "1");
      url.searchParams.set("filters", JSON.stringify({ id: clubId }));

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `Failed to fetch club (${response.status})`);
      }

      const result = await response.json();
      const record = (result?.data?.[0] ?? null) as ExternalClubRecord | null;
      setClub(record);
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

  return {
    club,
    loading,
    error,
    refetch: fetchClub,
  };
}
