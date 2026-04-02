import { useMemo } from 'react'
import FilterBar from '../Dashboard/FilterBar'
import EditableCell from '../InitiativeTable/EditableCell'
import EditableTextCell from '../InitiativeTable/EditableTextCell'
import Tooltip from '../UI/Tooltip'
import {
  formatHours,
  getDevelopmentEstimateHours,
} from '../../utils/initiativeInsights'

const ADMIN_COLUMNS = [
  { key: 'jira_key', label: 'Jira', tooltip: 'Chave do ticket no Jira.' },
  { key: 'summary', label: 'Iniciativa', tooltip: 'Resumo da iniciativa sincronizado do Jira.' },
  { key: 'assignee', label: 'Responsável', tooltip: 'Responsável atual do ticket no Jira.' },
  { key: 'affected_people_count', label: 'Pessoas afetadas', tooltip: 'Quantidade de pessoas impactadas pela automação. Usado em: horas_totais = horas_por_pessoa × pessoas_afetadas.', editable: true },
  { key: 'development_estimate', label: 'Tempo Dev Jira', tooltip: 'Tempo estimado de desenvolvimento vindo do Jira (em horas). Usado em: custo_dev = horas_dev × R$/h Dev.' },
  { key: 'tech_hour_cost', label: 'R$/h Dev', tooltip: 'Custo por hora do desenvolvedor. Fórmula: custo_dev = (tempo_dev_segundos ÷ 3600) × R$/h Dev.', editable: true },
  { key: 'cost_per_hour', label: 'R$/h Pessoas', tooltip: 'Custo médio por hora das pessoas afetadas. Fórmula: ganho_horas = (horas_salvas_dia × dias_execução_mês × pessoas_afetadas) × R$/h Pessoas.', editable: true },
  { key: 'token_cost', label: 'Custo Token', tooltip: 'Custo fixo estimado de tokens de IA. Somado diretamente ao custo total: custo_total = custo_dev + custo_terceiros + token_cost + cloud_infra_cost.', editable: true },
  { key: 'cloud_infra_cost', label: 'Custo Infra', tooltip: 'Custo de infraestrutura (cloud, n8n, etc). Somado diretamente ao custo total: custo_total = custo_dev + custo_terceiros + token_cost + cloud_infra_cost.', editable: true },
  { key: 'third_party_hours', label: 'Horas Terceiros', tooltip: 'Horas alocadas de terceiros. Fórmula: custo_terceiros = horas_terceiros × R$/h Terceiros.', editable: true },
  { key: 'third_party_hour_cost', label: 'R$/h Terceiros', tooltip: 'Custo por hora de terceiros. Fórmula: custo_terceiros = horas_terceiros × R$/h Terceiros.', editable: true },
  { key: 'total_gains', label: 'Ganhos', tooltip: 'Ganho mensal total calculado. Fórmula: ganhos = ganho_horas + ganho_headcount + ganho_produtividade. Onde ganho_horas = (horas_salvas_dia × dias_mês × pessoas) × R$/h Pessoas.', computed: true },
  { key: 'total_costs', label: 'Custos', tooltip: 'Custo total do investimento. Fórmula: custos = (horas_dev × R$/h Dev) + (horas_terceiros × R$/h Terceiros) + token_cost + cloud_infra_cost.', computed: true },
  { key: 'intangible_gains', label: 'Ganhos Intangíveis', tooltip: 'Ganhos qualitativos que não entram no cálculo financeiro, como redução de erros, satisfação da equipe, conformidade, etc.', editable: true, text: true },
]

const PILL_CONFIG = [
  { label: 'Iniciativas', color: '#3559EB', getValue: (items) => items.length },
  { label: 'Sem custo-base', color: '#FE70BD', getValue: (items) => items.filter((i) => !i.tech_hour_cost || !i.cost_per_hour).length },
  { label: 'Tempo dev Jira', color: '#3DB7F4', getValue: (items) => formatHours(items.reduce((s, i) => s + getDevelopmentEstimateHours(i), 0)) },
  { label: 'Custo projetado', color: '#F2F24B', getValue: (items) => formatCurrency(items.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)) },
]

function MetricPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className="text-[11px] font-semibold text-white/80">{value}</span>
    </div>
  )
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function AdminView({
  initiatives,
  filters,
  onFilterChange,
  onUpdateField,
}) {
  const adminInitiatives = useMemo(
    () =>
      initiatives.filter((initiative) => {
        if (filters.activityType && initiative.activity_type !== filters.activityType) return false
        if (filters.assignee && initiative.assignee !== filters.assignee) return false
        if (filters.statuses.length > 0) {
          const matchesStatus = filters.statuses.includes(initiative.jira_status)
          if (filters.statusOperator === 'equals' && !matchesStatus) return false
          if (filters.statusOperator === 'not_equals' && matchesStatus) return false
        }
        return true
      }),
    [initiatives, filters.activityType, filters.assignee, filters.statuses, filters.statusOperator]
  )

  function renderCell(initiative, column) {
    if (column.key === 'jira_key') {
      return (
        <a
          href={initiative.jira_url}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-[#3DB7F4]/80 transition-colors hover:text-[#3DB7F4]"
        >
          {initiative.jira_key}
        </a>
      )
    }

    if (column.key === 'summary') {
      return <span className="block max-w-[340px] truncate text-[13px] text-gray-300">{initiative.summary}</span>
    }

    if (column.key === 'development_estimate') {
      return <span className="text-[13px] text-gray-300">{formatHours(getDevelopmentEstimateHours(initiative))}</span>
    }

    if (column.editable && column.text) {
      return (
        <EditableTextCell
          value={initiative[column.key]}
          field={column.key}
          onSave={(field, value) => onUpdateField(initiative.id, field, value)}
        />
      )
    }

    if (column.editable) {
      return (
        <EditableCell
          value={initiative[column.key]}
          field={column.key}
          onSave={(field, value) => onUpdateField(initiative.id, field, value)}
        />
      )
    }

    if (column.computed) {
      const value = initiative.metrics?.[column.key]

      if (value == null) {
        return <span className="text-[11px] text-gray-700">N/A</span>
      }

      if (column.key === 'roi_percent') {
        return (
          <span className={value >= 0 ? 'text-[13px] font-semibold text-[#40EB4F]' : 'text-[13px] font-semibold text-accent-pink'}>
            {value.toFixed(1)}%
          </span>
        )
      }

      if (column.key === 'payback_months') {
        return <span className="text-[13px] text-gray-300">{value.toFixed(1)} meses</span>
      }

      return <span className="text-[13px] text-gray-300">{formatCurrency(value)}</span>
    }

    return <span className="text-[13px] text-gray-400">{initiative[column.key] || '—'}</span>
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Administração de custos</h2>
            <p className="text-[11px] text-gray-500">Campos manuais que não vêm do Jira. O tempo de desenvolvimento é lido automaticamente.</p>
          </div>
          <a
            href="/manual.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition-all hover:border-white/[0.1] hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Manual
          </a>
        </div>
        <FilterBar initiatives={initiatives} filters={filters} onFilterChange={onFilterChange} showStatus={true} />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {PILL_CONFIG.map((pill) => (
          <MetricPill key={pill.label} label={pill.label} value={pill.getValue(adminInitiatives)} color={pill.color} />
        ))}
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm">
        <table className="min-w-full table-auto text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-elevated/90 backdrop-blur-sm">
              {ADMIN_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 whitespace-nowrap border-b border-white/[0.04]"
                >
                  <span className="flex items-center gap-1">
                    {column.label}
                    <Tooltip content={column.tooltip} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {adminInitiatives.map((initiative) => (
              <tr
                key={initiative.id}
                className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
              >
                {ADMIN_COLUMNS.map((column) => (
                  <td key={column.key} className="px-3 py-2 align-middle">
                    {renderCell(initiative, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {adminInitiatives.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-600">
            Nenhuma iniciativa encontrada para os filtros atuais.
          </div>
        ) : null}
      </div>
    </>
  )
}
