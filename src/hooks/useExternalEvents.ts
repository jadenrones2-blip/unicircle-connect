import { useState, useEffect, useCallback } from 'react';
import { externalSupabase, ExternalEvent } from '@/integrations/external-supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

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

      const { data, error: fetchError } = await externalSupabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setEvents(data || []);
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

    // Set up realtime subscription
    let channel: RealtimeChannel | null = null;

    const setupRealtime = () => {
      channel = externalSupabase
        .channel('external-events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events'
          },
          (payload) => {
            console.log('Realtime event received:', payload);
            
            if (payload.eventType === 'INSERT') {
              setEvents(prev => [...prev, payload.new as ExternalEvent].sort(
                (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
              ));
            } else if (payload.eventType === 'UPDATE') {
              setEvents(prev => prev.map(event => 
                event.id === (payload.new as ExternalEvent).id 
                  ? payload.new as ExternalEvent 
                  : event
              ));
            } else if (payload.eventType === 'DELETE') {
              setEvents(prev => prev.filter(event => event.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        externalSupabase.removeChannel(channel);
      }
    };
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
