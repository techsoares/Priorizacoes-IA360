-- Adiciona agrupador da fila para suportar multiplos paineis (priorizacoes e em_desenvolvimento)
ALTER TABLE sprint_queue
  ADD COLUMN IF NOT EXISTS queue_group text;

UPDATE sprint_queue
SET queue_group = 'priorizacoes'
WHERE queue_group IS NULL OR queue_group = '';

ALTER TABLE sprint_queue
  ALTER COLUMN queue_group SET DEFAULT 'priorizacoes';

ALTER TABLE sprint_queue
  ALTER COLUMN queue_group SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sprint_queue_group_activity_position
  ON sprint_queue(queue_group, activity_type, position);
