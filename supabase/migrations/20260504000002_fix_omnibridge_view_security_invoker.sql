-- Fix security_definer_view ERROR on omnibridge_event_stats_hourly.
-- The view was created without security_invoker set; this corrects it so
-- the view runs with the calling user's privileges rather than the owner's.
-- Identified by Supabase Security Advisor post-v1.6.1 verification (2026-05-04).
ALTER VIEW IF EXISTS public.omnibridge_event_stats_hourly SET (security_invoker = true);
