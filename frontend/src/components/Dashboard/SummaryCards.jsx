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
    tooltip: 'Soma do ROI de cada iniciativa com custo > 0. Fórmula por iniciativa: ROI = ((ganhos_mensais × 12) − custos_totais) ÷ custos_totais × 100',
    color: '#3DB7F4',
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
    color: '#40EB4F',
    format: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
  {
    key: 'totalSavings',
    label: 'Economia total',
    tooltip: 'Projeção anual dos ganhos mensais. Fórmula: economia_total = economia_mensal × 12',
    color: '#40EB4F',
    format: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
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

  const values = { totalInitiatives, totalRoi, avgPayback, totalHoursSaved, totalEstimatedDevelopment, totalCosts, monthlySavings, totalSavings }

  return (
    <div className="mb-6">
      {selectedInitiative && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#3559EB]/20 bg-[#3559EB]/5 px-3 py-1.5 text-xs">
          <span className="text-gray-500">Exibindo:</span>
          <span className="font-medium text-[#3DB7F4] truncate">
            {selectedInitiative.jira_key} — {selectedInitiative.summary}
          </span>
          <button
            onClick={onClearSelection}
            className="ml-auto shrink-0 text-gray-500 transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {CARD_CONFIG.map((card) => (
          <div
            key={card.key}
            className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: card.color }} />
            <span className="text-[10px] text-gray-500">{card.label}</span>
            <span className="text-[11px] font-semibold text-white/80">{card.format(values[card.key])}</span>
            <Tooltip content={card.tooltip} />
          </div>
        ))}
      </div>
    </div>
  )
}
