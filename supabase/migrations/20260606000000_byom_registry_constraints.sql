-- Migration: byom_registry_constraints
-- Purpose: Update constraints on omnihub_model_registry for BYOM sovereign mode

ALTER TABLE public.omnihub_model_registry DROP CONSTRAINT omnihub_model_registry_provider_id_check;
ALTER TABLE public.omnihub_model_registry ADD CONSTRAINT omnihub_model_registry_provider_id_check 
  CHECK (provider_id IN ('openai', 'xai', 'anthropic', 'google', 'groq'));

ALTER TABLE public.omnihub_model_registry DROP CONSTRAINT omnihub_model_registry_pii_policy_check;
ALTER TABLE public.omnihub_model_registry ADD CONSTRAINT omnihub_model_registry_pii_policy_check 
  CHECK (pii_policy IN ('block', 'redact', 'allow_internal', 'passthrough'));
