import { useState, useEffect, useCallback } from 'react';

export interface ExternalEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  source: string | null;
  club_id: string | null;
  club_handle: string | null;
  source_url: string | null;
  caption: string | null;
  verified: boolean | null;
  corrected_title: string | null;
  corrected_start_time: string | null;
  corrected_end_time: string | null;
  corrected_location: string | null;
  reviewed_at: string | null;
  posted_at: string | null;
  created_at: string | null;
}

interface UseExternalEventsResult {
  events: ExternalEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useExternalEvents(): UseExternalEventsResult {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use edge function instead of direct client access
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db-proxy?table=events&select=*&orderBy=start_time&orderAsc=true&limit=500`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const result = await response.json();
      setEvents(result.data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    // Poll for updates every 30 seconds instead of realtime
    // (realtime requires direct client which exposes credentials)
    const pollInterval = setInterval(fetchEvents, 30000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
