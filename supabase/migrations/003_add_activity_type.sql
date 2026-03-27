-- =============================================
-- Migration: Adiciona campo activity_type (tipo de atividade)
-- =============================================

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS activity_type TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_initiatives_activity_type ON initiatives (activity_type);
