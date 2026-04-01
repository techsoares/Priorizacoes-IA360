-- Adiciona campos de auditoria para rastrear quem e quando alterou a ordem de priorização
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS priority_updated_by TEXT,
  ADD COLUMN IF NOT EXISTS priority_updated_at TIMESTAMPTZ;
