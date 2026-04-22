-- Adiciona suporte para ganhos únicos (one-time gains)
-- Para iniciativas com ganho único, o ROI não é projetado anualmente

ALTER TABLE initiatives ADD COLUMN is_one_time_gain BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN initiatives.is_one_time_gain IS 'Se true, o ganho é único/pontual, não é recorrente mensalmente. Afeta cálculo de ROI e payback.';
