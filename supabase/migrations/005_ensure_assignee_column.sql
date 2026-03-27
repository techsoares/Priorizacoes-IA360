-- =============================================
-- Migration: Garante coluna assignee em bases antigas
-- =============================================

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS assignee TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_initiatives_assignee ON initiatives (assignee);
CREATE INDEX IF NOT EXISTS idx_initiatives_jira_status ON initiatives (jira_status);
CREATE INDEX IF NOT EXISTS idx_initiatives_cost_center ON initiatives (cost_center);
