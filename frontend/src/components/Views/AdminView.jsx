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
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
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
        return true
      }),
    [initiatives, filters.activityType, filters.assignee]
  )

  function renderCell(initiative, column) {
    if (column.key === 'jira_key') {
      return (
        <a
          href={initiative.jira_url}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-accent-purple-light transition-colors hover:text-[#3DB7F4]"
        >
          {initiative.jira_key}
        </a>
      )
    }

    if (column.key === 'summary') {
      return <span className="block max-w-[340px] truncate text-gray-200">{initiative.summary}</span>
    }

    if (column.key === 'development_estimate') {
      return <span className="text-gray-200">{formatHours(getDevelopmentEstimateHours(initiative))}</span>
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
        return <span className="text-xs text-gray-600">N/A</span>
      }

      if (column.key === 'roi_percent') {
        return (
          <span className={value >= 0 ? 'font-semibold text-[#40EB4F]' : 'font-semibold text-accent-pink'}>
            {value.toFixed(1)}%
          </span>
        )
      }

      if (column.key === 'payback_months') {
        return <span className="text-gray-200">{value.toFixed(1)} meses</span>
      }

      return <span className="text-gray-200">{formatCurrency(value)}</span>
    }

    return <span className="text-gray-300">{initiative[column.key] || '—'}</span>
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Administração de custos</h2>
          <p className="text-xs text-gray-500">Campos manuais que não vêm do Jira. O tempo de desenvolvimento é lido automaticamente.</p>
        </div>
        <FilterBar initiatives={initiatives} filters={filters} onFilterChange={onFilterChange} showStatus={false} />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {PILL_CONFIG.map((pill) => (
          <MetricPill key={pill.label} label={pill.label} value={pill.getValue(adminInitiatives)} color={pill.color} />
        ))}
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] rounded-xl border border-white/8 bg-white/[0.03]">
        <table className="min-w-full table-auto text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[linear-gradient(90deg,rgba(1,32,235,0.30),rgba(254,112,189,0.18))] backdrop-blur-sm">
              {ADMIN_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-300 whitespace-nowrap border-b border-white/8"
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
                className="border-b border-white/5 transition-colors hover:bg-[rgba(53,89,235,0.05)]"
              >
                {ADMIN_COLUMNS.map((column) => (
                  <td key={column.key} className="px-3 py-2.5 align-middle">
                    {renderCell(initiative, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {adminInitiatives.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-500">
            Nenhuma iniciativa encontrada para os filtros atuais.
          </div>
        ) : null}
      </div>
    </>
  )
}
