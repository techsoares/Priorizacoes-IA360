-- =============================================
-- Migration: Expande campos do Jira para analytics
-- =============================================

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_url TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS project_key TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS gain_type TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS gain TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS tool TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_priority TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS assignee_email TEXT DEFAULT '';
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_description TEXT DEFAULT '';

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS resolution_date TIMESTAMPTZ;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_created_at TIMESTAMPTZ;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_updated_at TIMESTAMPTZ;

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS time_saved_per_day NUMERIC(12,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS affected_people_count NUMERIC(12,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS execution_days_per_month NUMERIC(12,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS development_estimate_seconds NUMERIC(14,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS time_spent_seconds NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_initiatives_project_key ON initiatives (project_key);
CREATE INDEX IF NOT EXISTS idx_initiatives_activity_type_v2 ON initiatives (activity_type);
CREATE INDEX IF NOT EXISTS idx_initiatives_due_date ON initiatives (due_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_resolution_date ON initiatives (resolution_date);
