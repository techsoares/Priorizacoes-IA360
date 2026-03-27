ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS third_party_hours NUMERIC(12,2) DEFAULT 0;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS third_party_hour_cost NUMERIC(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_initiatives_third_party_hours ON initiatives (third_party_hours);
