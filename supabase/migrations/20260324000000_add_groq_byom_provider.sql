-- ============================================================
-- Migration:  20260324000000_add_groq_byom_provider.sql
-- Project:    APEX OmniHub — BYOM Cockpit
-- Purpose:    Add 'groq' to byom_provider enum
-- Date:       2026-03-24
-- ============================================================

ALTER TYPE byom_provider ADD VALUE IF NOT EXISTS 'groq';
