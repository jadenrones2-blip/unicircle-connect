
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS linkedin text;
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS "recruitingStatus" text DEFAULT 'closed' CHECK ("recruitingStatus" IN ('open','upcoming','closed'));
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS recruitment_cycle text DEFAULT 'none' CHECK (recruitment_cycle IN ('fall','winter','spring','rolling','none'));

