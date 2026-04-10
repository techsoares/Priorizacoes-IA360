-- Tabela de fila de próximas demandas por sprint
CREATE TABLE IF NOT EXISTS sprint_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  initiative_id uuid NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- Garante que cada iniciativa só aparece uma vez na fila
CREATE UNIQUE INDEX IF NOT EXISTS sprint_queue_initiative_unique
  ON sprint_queue(initiative_id);

ALTER TABLE sprint_queue ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler
CREATE POLICY "authenticated users can read sprint queue"
  ON sprint_queue FOR SELECT TO authenticated USING (true);

-- Somente admins podem inserir, atualizar e remover
CREATE POLICY "admins can insert sprint queue"
  ON sprint_queue FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "admins can update sprint queue"
  ON sprint_queue FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "admins can delete sprint queue"
  ON sprint_queue FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE email = (auth.jwt() ->> 'email')));
