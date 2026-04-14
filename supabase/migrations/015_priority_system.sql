ALTER TABLE initiatives
ADD COLUMN IF NOT EXISTS priority_base_score NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_request_score NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_final_score NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_requests_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority_score_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS priority_score_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_initiatives_priority_final_score
ON initiatives (priority_final_score DESC);

CREATE TABLE IF NOT EXISTS priority_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  requester_name TEXT DEFAULT '',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  ai_model TEXT DEFAULT '',
  ai_delta_score NUMERIC(6,2) DEFAULT 0,
  ai_confidence NUMERIC(6,2),
  ai_rationale TEXT DEFAULT '',
  ai_mode TEXT DEFAULT '',
  ai_payload JSONB DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE priority_requests
ADD COLUMN IF NOT EXISTS requester_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS ai_delta_score NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS ai_rationale TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS ai_mode TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS ai_payload JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE priority_requests
DROP COLUMN IF EXISTS business_impact,
DROP COLUMN IF EXISTS urgency_context;

CREATE INDEX IF NOT EXISTS idx_priority_requests_initiative
ON priority_requests (initiative_id);

CREATE INDEX IF NOT EXISTS idx_priority_requests_status
ON priority_requests (status);

DROP INDEX IF EXISTS uq_priority_requests_active_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS uq_priority_requests_once_per_user_initiative
ON priority_requests (initiative_id, requester_email);

DROP TRIGGER IF EXISTS trigger_update_priority_requests_timestamp ON priority_requests;

CREATE TRIGGER trigger_update_priority_requests_timestamp
  BEFORE UPDATE ON priority_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE priority_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read priority requests" ON priority_requests;
DROP POLICY IF EXISTS "Authenticated users can insert own priority requests" ON priority_requests;
DROP POLICY IF EXISTS "Users can update own active priority requests" ON priority_requests;
DROP POLICY IF EXISTS "Users can update own priority requests" ON priority_requests;
DROP POLICY IF EXISTS "Admins can delete priority requests" ON priority_requests;

CREATE POLICY "Authenticated users can read priority requests"
  ON priority_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert own priority requests"
  ON priority_requests FOR INSERT TO authenticated
  WITH CHECK (requester_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can update own priority requests"
  ON priority_requests FOR UPDATE TO authenticated
  USING (
    requester_email = (auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email'))
  )
  WITH CHECK (
    requester_email = (auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email'))
  );

CREATE POLICY "Admins can delete priority requests"
  ON priority_requests FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email'))
  );
