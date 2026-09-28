-- ROLLBACK: 20260928010000_access_requests_lead_alert.sql (WP-05 F-10)
-- Removes only the alert trigger and its function; lead rows are untouched.
DROP TRIGGER IF EXISTS access_requests_lead_alert_trigger ON public.access_requests;
DROP FUNCTION IF EXISTS public.notify_access_request();
