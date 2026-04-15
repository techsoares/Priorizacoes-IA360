-- =============================================
-- Tabela: initiatives
-- Dashboard de Priorização IA360°
-- =============================================

CREATE TABLE IF NOT EXISTS initiatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Dados vindos do Jira
    jira_key TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL DEFAULT '',
    cost_center TEXT DEFAULT '',
    jira_status TEXT DEFAULT '',

    -- Ordem de prioridade (drag and drop)
    priority_order INTEGER NOT NULL DEFAULT 0,

    -- Campos manuais (preenchidos pelo usuário)
    hours_saved NUMERIC(12,2) DEFAULT 0,
    cost_per_hour NUMERIC(12,2) DEFAULT 0,
    headcount_reduction NUMERIC(12,2) DEFAULT 0,
    monthly_employee_cost NUMERIC(12,2) DEFAULT 0,
    productivity_increase NUMERIC(12,2) DEFAULT 0,
    additional_task_value NUMERIC(12,2) DEFAULT 0,
    tokens_used NUMERIC(16,4) DEFAULT 0,
    token_cost NUMERIC(12,6) DEFAULT 0,
    cloud_infra_cost NUMERIC(12,2) DEFAULT 0,
    maintenance_hours NUMERIC(12,2) DEFAULT 0,
    tech_hour_cost NUMERIC(12,2) DEFAULT 0,
    devops_hours NUMERIC(12,2) DEFAULT 0,
    devops_hour_cost NUMERIC(12,2) DEFAULT 0,
    estimated_time_months NUMERIC(6,2) DEFAULT 0,
    tools TEXT DEFAULT '',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para ordenação rápida
CREATE INDEX IF NOT EXISTS idx_initiatives_priority ON initiatives (priority_order);

-- Índice para busca por chave Jira
CREATE INDEX IF NOT EXISTS idx_initiatives_jira_key ON initiatives (jira_key);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_initiatives_timestamp
    BEFORE UPDATE ON initiatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) — Agente InfoSec
-- Apenas usuários autenticados podem ler e escrever
-- =============================================
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read initiatives"
    ON initiatives FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert initiatives"
    ON initiatives FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update initiatives"
    ON initiatives FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
