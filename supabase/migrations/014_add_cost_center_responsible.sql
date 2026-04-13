ALTER TABLE initiatives
ADD COLUMN IF NOT EXISTS cost_center_responsible TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_initiatives_cost_center_responsible
ON initiatives (cost_center_responsible);
