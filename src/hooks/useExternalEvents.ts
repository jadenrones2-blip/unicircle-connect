import { useState, useEffect, useCallback } from 'react';
import { dataClient } from "@/integrations/supabase/dataClient";

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

      const { data, error: dbError } = await dataClient
        .from('events')
        .select('*')
        .order('start_time', { ascending: true })
        .limit(500);

      if (dbError) throw new Error(dbError.message);

      setEvents((data || []) as ExternalEvent[]);
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
    const pollInterval = setInterval(fetchEvents, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
