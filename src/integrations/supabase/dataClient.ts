import { createClient } from '@supabase/supabase-js';

// Direct client to the primary data database (clubs, events, interests)
// This bypasses the edge function proxy entirely — no secrets needed, no breakage
const DATA_URL = 'https://tayhvgmterjzolvodwow.supabase.co';
const DATA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWh2Z210ZXJqem9sdm9kd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2OTExODIsImV4cCI6MjA4NDI2NzE4Mn0.QUBp8guzuSsRh_9hpVOsqsGFlRn7IO6adwZRMRL8UHI';

export const dataClient = createClient(DATA_URL, DATA_KEY);
