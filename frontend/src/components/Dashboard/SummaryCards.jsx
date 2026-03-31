import Tooltip from '../UI/Tooltip'

const CARD_CONFIG = [
  {
    key: 'totalInitiatives',
    label: 'Iniciativas',
    tooltip: 'Contagem simples das iniciativas exibidas após aplicar os filtros ativos.',
    color: '#3559EB',
    format: (v) => v,
  },
  {
    key: 'totalRoi',
    label: 'ROI total',
    tooltip: 'Soma do ROI de cada iniciativa com custo > 0. Fórmula por iniciativa: ROI = (ganhos_mensais − custos_totais) ÷ custos_totais × 100',
    color: '#40EB4F',
    format: (v) => (v != null ? `${v.toFixed(1)}%` : '—'),
  },
  {
    key: 'avgPayback',
    label: 'Payback médio',
    tooltip: 'Média do payback das iniciativas com ganhos > 0. Fórmula por iniciativa: Payback (meses) = custos_totais ÷ ganhos_mensais',
    color: '#FE70BD',
    format: (v) => (v != null ? `${v.toFixed(1)} m` : '—'),
  },
  {
    key: 'totalHoursSaved',
    label: 'Horas economizadas',
    tooltip: 'Soma das horas economizadas por mês em todas as iniciativas. Fórmula por iniciativa: horas = horas_salvas_dia × dias_execução_mês × pessoas_afetadas',
    color: '#3DB7F4',
    format: (v) => `${v.toLocaleString('pt-BR')} h/mês`,
  },
  {
    key: 'totalEstimatedDevelopment',
    label: 'Tempo dev',
    tooltip: 'Soma do tempo estimado de desenvolvimento vindo do Jira. Fórmula: horas_dev = development_estimate_seconds ÷ 3600',
    color: '#F2F24B',
    format: (v) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`,
  },
  {
    key: 'totalCosts',
    label: 'Custo total',
    tooltip: 'Soma dos custos de todas as iniciativas. Fórmula por iniciativa: custos = (horas_dev × R$/h Dev) + (horas_terceiros × R$/h Terceiros) + token_cost + cloud_infra_cost',
    color: '#FE70BD',
    format: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
  {
    key: 'monthlySavings',
    label: 'Economia/mês',
    tooltip: 'Soma dos ganhos mensais de todas as iniciativas. Fórmula por iniciativa: ganhos = (horas_salvas_dia × dias_mês × pessoas × R$/h Pessoas) + (headcount × custo_funcionário) + (produtividade × valor_tarefa)',
    color: '#6BFFEB',
    format: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
  {
    key: 'totalSavings',
    label: 'Economia total',
    tooltip: 'Projeção anual dos ganhos mensais. Fórmula: economia_total = economia_mensal × 12',
    color: '#40EB4F',
    format: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
  {
    key: 'totalAccumulatedRoi',
    label: 'ROI acumulado',
    tooltip: 'Soma do ROI acumulado real de todas as iniciativas entregues.',
    color: '#3DB7F4',
    format: (v) => (v != null ? `${v.toFixed(1)}%` : '—'),
  },
]

export default function SummaryCards({ initiatives, selectedInitiative, onClearSelection }) {
  const totalInitiatives = initiatives.length

  const withRoi = initiatives.filter((i) => i.metrics?.roi_percent != null)
  const totalRoi = withRoi.length > 0
    ? withRoi.reduce((s, i) => s + i.metrics.roi_percent, 0)
    : null

  const withPayback = initiatives.filter((i) => i.metrics?.payback_months != null)
  const avgPayback = withPayback.length > 0
    ? withPayback.reduce((s, i) => s + i.metrics.payback_months, 0) / withPayback.length
    : null

  const totalHoursSaved = initiatives.reduce((s, i) => {
    return s + (i.time_saved_per_day || 0) * (i.execution_days_per_month || 0) * (i.affected_people_count || 0)
  }, 0)

  const totalEstimatedDevelopment = initiatives.reduce((s, i) =>
    s + (i.development_estimate_seconds ? i.development_estimate_seconds / 3600 : 0), 0)

  const totalCosts = initiatives.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)
  const monthlySavings = initiatives.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0)
  const totalSavings = monthlySavings * 12

  const withAccumulatedRoi = initiatives.filter((i) => i.metrics?.roi_accumulated != null)
  const totalAccumulatedRoi = withAccumulatedRoi.length > 0
    ? withAccumulatedRoi.reduce((s, i) => s + i.metrics.roi_accumulated, 0)
    : null

  const values = {
    totalInitiatives,
    totalRoi,
    avgPayback,
    totalHoursSaved,
    totalEstimatedDevelopment,
    totalCosts,
    monthlySavings,
    totalSavings,
    totalAccumulatedRoi
  }

  return (
    <div className="mb-6">
      {selectedInitiative && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
          <span className="text-gray-500">Exibindo:</span>
          <span className="font-medium text-[#3DB7F4] truncate">
            {selectedInitiative.jira_key} — {selectedInitiative.summary}
          </span>
          <button
            onClick={onClearSelection}
            className="ml-auto shrink-0 rounded p-0.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9">
        {CARD_CONFIG.map((card) => {
          const formattedValue = card.format(values[card.key])
          return (
            <div
              key={card.key}
              className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-all hover:border-white/[0.08] hover:bg-white/[0.04]"
            >
              {/* Glow accent */}
              <div
                className="pointer-events-none absolute -right-3 -top-3 h-10 w-10 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-40"
                style={{ background: card.color }}
              />

              <div className="relative">
                <div className="mb-1.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: card.color }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{card.label}</span>
                  <Tooltip content={card.tooltip} />
                </div>
                <div className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white/90">{formattedValue}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
