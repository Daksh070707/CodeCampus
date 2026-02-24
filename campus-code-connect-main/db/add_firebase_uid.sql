-- Add firebase_uid column to profiles and unique index
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS firebase_uid text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles (firebase_uid);

-- Optional: backfill firebase_uid for existing rows if you have a mapping
-- UPDATE public.profiles SET firebase_uid = <firebase_uid> WHERE email = '<email>';
