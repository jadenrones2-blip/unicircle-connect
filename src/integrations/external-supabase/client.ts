import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'sb_publishable_lv3PPFiSGAO3oInnZZzUXw_g1WMNsI4';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

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
}
