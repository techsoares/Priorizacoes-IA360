import { useMemo, useState } from 'react'
import FilterBar from '../Dashboard/FilterBar'
import EditableCell from '../InitiativeTable/EditableCell'
import EditableTextCell from '../InitiativeTable/EditableTextCell'
import Tooltip from '../UI/Tooltip'
import { recalculateScores } from '../../services/api'
import {
  formatHours,
  getDevelopmentEstimateHours,
  getTimeSpentHours,
  getTimeVariancePercent,
  getTimeVarianceStatus,
  getTimeVarianceColor,
} from '../../utils/initiativeInsights'

const ADMIN_COLUMNS = [
  { key: 'jira_key', label: 'Jira', tooltip: 'Chave do ticket no Jira.' },
  { key: 'summary', label: 'Iniciativa', tooltip: 'Resumo da iniciativa sincronizado do Jira.' },
  { key: 'assignee', label: 'Responsável', tooltip: 'Responsável atual do ticket no Jira.' },
  { key: 'affected_people_count', label: 'Pessoas afetadas', tooltip: 'Quantidade de pessoas impactadas pela automação. Usado em: horas_totais = horas_por_pessoa x pessoas_afetadas.', editable: true },
  { key: 'development_time_comparison', label: 'Tempo Dev (Est. vs Real)', tooltip: 'Tempo estimado vs tempo real gasto. Permite validar precisão de estimativas e calcular CAPEX com base em estimativa ou real.', computed: true },
  { key: 'time_variance', label: 'Variância (%)', tooltip: 'Eficiência de estimativa: (real - estimado) / estimado x 100. Positivo = atrasado, negativo = adiantado.', computed: true },
  { key: 'is_one_time_gain', label: 'Ganho Único', tooltip: 'Se marcado, o ganho é único/pontual e não é considerado como ganho mensal recorrente. Afeta o cálculo de ROI e payback.', editable: true, boolean: true },
  { key: 'tech_hour_cost', label: 'R$/h Dev', tooltip: 'Custo por hora do desenvolvedor. Usado para calcular CAPEX: horas_desenvolvimento x R$/h Dev.', editable: true },
  { key: 'devops_hours', label: 'Tempo DevOps', tooltip: 'Horas de DevOps necessárias para colocar a iniciativa no ar. Entra apenas como CAPEX one-time.', editable: true },
  { key: 'devops_hour_cost', label: 'R$/h DevOps', tooltip: 'Custo por hora do time de DevOps. Multiplicado pelo Tempo DevOps e somado ao CAPEX one-time.', editable: true },
  { key: 'cost_per_hour', label: 'R$/h Pessoas', tooltip: 'Custo médio por hora das pessoas afetadas. Fórmula: ganho_horas = horas_salvas_dia x dias_execucao_mes x pessoas_afetadas x R$/h Pessoas.', editable: true },
  { key: 'token_cost', label: 'Custo Token', tooltip: 'Custo fixo estimado de tokens de IA que entra como custo mensal recorrente.', editable: true },
  { key: 'cloud_infra_cost', label: 'Custo Infra', tooltip: 'Custo de infraestrutura (cloud, n8n, etc.) que entra como custo mensal recorrente.', editable: true },
  { key: 'third_party_hours', label: 'Horas Terceiros', tooltip: 'Horas alocadas de terceiros (parte de CAPEX).', editable: true },
  { key: 'third_party_hour_cost', label: 'R$/h Terceiros', tooltip: 'Custo por hora de terceiros (parte de CAPEX).', editable: true },
  { key: 'total_gains', label: 'OPEX Líquido/mês', tooltip: 'OPEX mensal líquido: economia operacional gerada pela automação, já descontados custos recorrentes de manutenção, tokens e infraestrutura.', computed: true },
  { key: 'total_costs', label: 'CAPEX (Investimento)', tooltip: 'CAPEX total one-time da iniciativa. Cálculo: (horas_dev x R$/h_dev) + (horas_devops x R$/h_devops) + (horas_terceiros x R$/h_terceiros).', computed: true },
  { key: 'intangible_gains', label: 'Ganhos Intangíveis', tooltip: 'Ganhos qualitativos que não entram no cálculo financeiro, como redução de erros, satisfação da equipe e conformidade.', editable: true, text: true },
]

const PILL_CONFIG = [
  { label: 'Iniciativas', color: '#3559EB', getValue: (items) => items.length, filterFn: null },
  { label: 'Sem custo-base', color: '#FE70BD', getValue: (items) => items.filter((i) => !i.tech_hour_cost || !i.cost_per_hour).length, filterFn: (i) => !i.tech_hour_cost || !i.cost_per_hour },
  { label: 'Tempo dev Jira', color: '#3DB7F4', getValue: (items) => formatHours(items.reduce((s, i) => s + getDevelopmentEstimateHours(i), 0)), filterFn: null },
  { label: 'Custo projetado', color: '#F2F24B', getValue: (items) => formatCurrency(items.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)), filterFn: null },
]

function MetricPill({ label, value, color, isActive, onClick, clickable }) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all
        ${clickable ? 'cursor-pointer hover:bg-white/[0.05]' : ''}
        ${isActive ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.05] bg-white/[0.02]'}
      `}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className="text-[11px] font-semibold text-white/80">{value}</span>
      {isActive && <span className="ml-1 text-[8px] text-gray-400">x</span>}
    </div>
  )
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getSelectedCostCenters(filters) {
  if (Array.isArray(filters.costCenters)) {
    return filters.costCenters.filter(Boolean)
  }
  return filters.costCenter ? [filters.costCenter] : []
}

export default function AdminView({
  initiatives,
  filters,
  onFilterChange,
  onUpdateField,
  isAdmin = false,
}) {
  const [activePillFilter, setActivePillFilter] = useState(null)
  const [scoreRecalcStatus, setScoreRecalcStatus] = useState(null) // null | 'loading' | 'ok' | 'error'

  async function handleRecalculateScores() {
    setScoreRecalcStatus('loading')
    try {
      const result = await recalculateScores()
      setScoreRecalcStatus('ok')
      setTimeout(() => setScoreRecalcStatus(null), 4000)
      console.info('[AdminView] Scores recalculados:', result)
    } catch (err) {
      setScoreRecalcStatus('error')
      setTimeout(() => setScoreRecalcStatus(null), 5000)
      console.error('[AdminView] Erro ao recalcular scores:', err)
    }
  }

  const adminInitiatives = useMemo(() => {
      const selectedCostCenters = getSelectedCostCenters(filters)

      return initiatives.filter((initiative) => {
        if (filters.activityType && initiative.activity_type !== filters.activityType) return false
        if (filters.assignee && initiative.assignee !== filters.assignee) return false
      if (filters.costCenterResponsible && initiative.cost_center_responsible !== filters.costCenterResponsible) return false
        if (selectedCostCenters.length > 0 && !selectedCostCenters.includes(initiative.cost_center)) return false
        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase()
          const matchesSearch =
            initiative.summary?.toLowerCase().includes(term) ||
            initiative.jira_key?.toLowerCase().includes(term)
          if (!matchesSearch) return false
        }
        if (filters.statuses.length > 0) {
          const matchesStatus = filters.statuses.includes(initiative.jira_status)
          if (filters.statusOperator === 'equals' && !matchesStatus) return false
          if (filters.statusOperator === 'not_equals' && matchesStatus) return false
        }
      return true
    })
  }, [initiatives, filters])

  const displayedInitiatives = useMemo(() => {
    if (!activePillFilter) return adminInitiatives
    const pill = PILL_CONFIG.find((item) => item.label === activePillFilter)
    return pill?.filterFn ? adminInitiatives.filter(pill.filterFn) : adminInitiatives
  }, [adminInitiatives, activePillFilter])

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

    if (column.key === 'development_time_comparison') {
      const estimated = getDevelopmentEstimateHours(initiative)
      const spent = getTimeSpentHours(initiative)
      const hasReal = spent > 0
      return (
        <div className="flex items-center gap-2 text-[13px] text-gray-300">
          <span className="text-[11px] font-semibold text-blue-400">{formatHours(estimated)}</span>
          {hasReal && (
            <>
              <span className="text-[10px] text-gray-600">-&gt;</span>
              <span className="text-[11px] font-semibold text-amber-400">{formatHours(spent)}</span>
            </>
          )}
          {!hasReal && <span className="text-[10px] italic text-gray-600">sem registro real</span>}
        </div>
      )
    }

    if (column.key === 'time_variance') {
      const variance = getTimeVariancePercent(initiative)
      const status = getTimeVarianceStatus(variance)
      const color = getTimeVarianceColor(variance)

      if (variance === null) {
        return <span className="text-[11px] text-gray-700">-</span>
      }

      return (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold" style={{ color }}>
            {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
          </span>
          <span className="text-[10px] font-medium text-gray-600">{status}</span>
        </div>
      )
    }

    if (column.editable && column.boolean) {
      if (!isAdmin) {
        return <span className="cursor-not-allowed text-[11px] italic text-gray-700" title="Apenas administradores podem editar">-</span>
      }
      const isActive = Boolean(initiative[column.key])
      return (
        <button
          onClick={() => onUpdateField(initiative.id, column.key, !isActive)}
          className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all
            ${isActive
              ? 'border border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/15'
              : 'border border-gray-600/30 bg-gray-600/10 text-gray-400 hover:bg-gray-600/15'
            }
          `}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
          {isActive ? 'Sim' : 'Não'}
        </button>
      )
    }

    if (column.editable && column.text) {
      if (!isAdmin) {
        return <span className="cursor-not-allowed text-[11px] italic text-gray-700" title="Apenas administradores podem editar">-</span>
      }
      return (
        <EditableTextCell
          value={initiative[column.key]}
          field={column.key}
          onSave={(field, value) => onUpdateField(initiative.id, field, value)}
        />
      )
    }

    if (column.editable) {
      if (!isAdmin) {
        return <span className="cursor-not-allowed text-[11px] italic text-gray-700" title="Apenas administradores podem editar">-</span>
      }
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

      if (column.key === 'total_costs' || column.key === 'total_gains') {
        return <span className="text-[13px] font-semibold text-gray-300">{formatCurrency(value)}</span>
      }

      return <span className="text-[13px] text-gray-300">{formatCurrency(value)}</span>
    }

    return <span className="text-[13px] text-gray-400">{initiative[column.key] || '-'}</span>
  }

  return (
    <>
      {!isAdmin && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-[11px] text-amber-200">
            <p className="font-semibold">Modo visualização</p>
            <p>Você não é administrador. Os campos de custo estão bloqueados para edição. Solicite acesso ao administrador do sistema para editá-los.</p>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="shrink-0 text-sm font-semibold text-white">Administração de custos</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleRecalculateScores}
              disabled={scoreRecalcStatus === 'loading'}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all
                ${scoreRecalcStatus === 'ok' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                  scoreRecalcStatus === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                  'border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-white/[0.14] hover:text-gray-200'}
                disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {scoreRecalcStatus === 'loading' ? (
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : scoreRecalcStatus === 'ok' ? (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {scoreRecalcStatus === 'loading' ? 'Recalculando...' :
               scoreRecalcStatus === 'ok' ? 'Scores atualizados' :
               scoreRecalcStatus === 'error' ? 'Erro — tente novamente' :
               'Recalcular Scores'}
            </button>
          )}
          <FilterBar
            initiatives={initiatives}
            filters={filters}
            onFilterChange={onFilterChange}
            showStatus={true}
            showAssignee={false}
            showItemType={false}
            showSearch
            showPriorityToggle={false}
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {PILL_CONFIG.map((pill) => (
          <MetricPill
            key={pill.label}
            label={pill.label}
            value={pill.getValue(adminInitiatives)}
            color={pill.color}
            isActive={activePillFilter === pill.label}
            clickable={pill.filterFn !== null}
            onClick={() => setActivePillFilter(activePillFilter === pill.label ? null : pill.label)}
          />
        ))}
      </div>

      <div className="max-h-[calc(100vh-280px)] overflow-x-auto overflow-y-auto rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm">
        <table className="min-w-full table-auto text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-elevated/90 backdrop-blur-sm">
              {ADMIN_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap border-b border-white/[0.04] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500"
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
            {displayedInitiatives.map((initiative) => (
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
