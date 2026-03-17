import { createClient } from '@supabase/supabase-js';

// Direct client to the primary data database (clubs, events, interests)
// This bypasses the edge function proxy entirely — no secrets needed, no breakage
const DATA_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const DATA_KEY = 'sb_publishable_lv3PPFiSGAO3oInnZZzUXw_g1WMNsI4';

export const dataClient = createClient(DATA_URL, DATA_KEY);
