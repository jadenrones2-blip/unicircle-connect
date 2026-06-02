import { useState, useEffect, useCallback } from 'react';
import { dataClient } from '@/integrations/supabase/dataClient';
import type { Club, Event } from '@/data/mockData';
import { useClubsContext } from '@/contexts/ClubsContext';

interface UseExternalDBResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Transform external DB event record to app Event type
const transformEvent = (record: Record<string, unknown>, clubs: Club[]): Event => {
  const rawType = String(record.type || record.event_type || 'event').toLowerCase();
  let type: Event['type'] = 'event';
  if (rawType.includes('recruit')) type = 'recruitment';
  else if (rawType.includes('workshop')) type = 'workshop';
  else if (rawType.includes('social')) type = 'social';

  const clubId = String(record.club_id || record.clubId || '');
  const club = clubs.find((c) => c.id === clubId);

  // Native events use start_time (ISO timestamp); scraped events use date + time fields.
  // Extract date string from whichever is present.
  const rawStart = String(record.corrected_start_time || record.start_time || '');
  const date = String(record.date || record.event_date || (rawStart ? rawStart.slice(0, 10) : ''));
  const time = String(
    record.time || record.event_time || (rawStart.includes('T') ? rawStart.slice(11, 16) : '')
  );

  return {
    id: String(record.id || ''),
    title: String(record.corrected_title || record.title || record.name || ''),
    clubId,
    clubName: String(record.club_name || record.clubName || club?.name || ''),
    date,
    time,
    location: String(record.corrected_location || record.location || ''),
    type,
    description: String(record.description || ''),
    imageUrl: String(record.image_url || record.imageUrl || ''),
  };
};

export function useClubs(): UseExternalDBResult<Club> {
  // Delegates to ClubsContext — single fetch + in-memory cache for the whole session
  const { clubs, loading, error, refetch } = useClubsContext();
  return { data: clubs, loading, error, refetch };
}

export function useEvents(clubs: Club[]): UseExternalDBResult<Event> {
  const [data, setData] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (clubs.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const _d = new Date();
      const startOfToday = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}T00:00:00`;
      const { data: records, error: dbError } = await dataClient
        .from('events')
        .select('*')
        .eq('verified', true)
        .gte('start_time', startOfToday)
        .order('start_time', { ascending: true })
        .limit(200);

      if (dbError) {
        // Gracefully handle missing table
        if (dbError.code === 'PGRST205' || dbError.message?.includes('does not exist')) {
          setData([]);
          return;
        }
        throw new Error(dbError.message);
      }

      const events = (records || []).map((record) =>
        transformEvent(record as Record<string, unknown>, clubs)
      );
      setData(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [clubs]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { data, loading, error, refetch: fetchEvents };
}

export async function submitInterest(data: {
  name: string;
  email: string;
  clubId: string;
  clubName: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: dbError } = await dataClient.from('interests').insert({
      name: data.name,
      email: data.email,
      club_id: data.clubId,
      club_name: data.clubName,
      message: data.message || null,
    });

    if (dbError) throw new Error(dbError.message);
    return { success: true };
  } catch (err) {
    console.error('Error submitting interest:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit',
    };
  }
}
