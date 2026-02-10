import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * A PKCE-enabled Supabase client used exclusively for password recovery.
 *
 * PKCE (Proof Key for Code Exchange) generates a `?code=` link instead of
 * hash-based tokens. This prevents email link-preview bots from consuming
 * the one-time token before the user clicks the link — because the code
 * can only be exchanged client-side with the stored code_verifier.
 */
export const supabasePkce = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      flowType: 'pkce',
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
