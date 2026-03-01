
-- Add missing columns to licenses table
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS allowed_device_count integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS grace_period_hours integer NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS last_validated_at timestamptz;

-- Add missing column to device_registrations table
ALTER TABLE public.device_registrations
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
