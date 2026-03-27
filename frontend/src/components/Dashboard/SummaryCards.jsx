import Tooltip from '../UI/Tooltip'

const ICONS = {
  totalInitiatives: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  avgRoi: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  avgPayback: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  totalHoursSaved: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  totalCosts: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const CARDS_CONFIG = [
  {
    label: 'Iniciativas',
    key: 'totalInitiatives',
    format: (v) => v,
    color: 'border-primary',
    iconColor: 'text-primary-light bg-primary/10',
    tooltip: 'Quantidade total de iniciativas exibidas (respeitando filtros ativos).',
  },
  {
    label: 'ROI Médio',
    key: 'avgRoi',
    format: (v) => (v != null ? `${v.toFixed(1)}%` : 'N/A'),
    color: 'border-accent-purple',
    iconColor: 'text-accent-purple-light bg-accent-purple/10',
    tooltip:
      'ROI = ((Ganhos - Custos) / Custos) × 100\nMédia de todas as iniciativas com custos > 0.',
  },
  {
    label: 'Payback Médio',
    key: 'avgPayback',
    format: (v) => (v != null ? `${v.toFixed(1)} meses` : 'N/A'),
    color: 'border-accent-purple-light',
    iconColor: 'text-accent-purple bg-accent-purple/10',
    tooltip:
      'Payback = (Custos × 12) / Ganhos\nTempo médio para recuperar o investimento.',
  },
  {
    label: 'Economia de Tempo',
    key: 'totalHoursSaved',
    format: (v) => `${v.toLocaleString('pt-BR')} h/mês`,
    color: 'border-primary',
    iconColor: 'text-primary-light bg-primary/10',
    tooltip: 'Soma de horas economizadas por mês de todas as iniciativas.',
  },
  {
    label: 'Custo Total Dev',
    key: 'totalCosts',
    format: (v) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    color: 'border-accent-pink',
    iconColor: 'text-accent-pink bg-accent-pink/10',
    tooltip:
      'Custos = (Tokens × Custo/Token) + Custo Infra + (Horas Manutenção × Custo/Hora Técnico)\nSoma mensal de todas as iniciativas.',
  },
]

export default function SummaryCards({ initiatives }) {
  const totalInitiatives = initiatives.length

  const withRoi = initiatives.filter((i) => i.metrics?.roi_percent != null)
  const avgRoi =
    withRoi.length > 0
      ? withRoi.reduce((sum, i) => sum + i.metrics.roi_percent, 0) / withRoi.length
      : null

  const withPayback = initiatives.filter((i) => i.metrics?.payback_months != null)
  const avgPayback =
    withPayback.length > 0
      ? withPayback.reduce((sum, i) => sum + i.metrics.payback_months, 0) /
        withPayback.length
      : null

  const totalHoursSaved = initiatives.reduce((sum, i) => sum + (i.hours_saved || 0), 0)

  const totalCosts = initiatives.reduce(
    (sum, i) => sum + (i.metrics?.total_costs || 0),
    0
  )

  const values = { totalInitiatives, avgRoi, avgPayback, totalHoursSaved, totalCosts }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {CARDS_CONFIG.map((card) => (
        <div
          key={card.key}
          className={`bg-surface-card rounded-xl p-5 border-l-4 ${card.color} border border-white/5 hover:border-accent-purple/15 transition-all group`}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
              {card.label}
              <Tooltip content={card.tooltip} />
            </span>
            <span className={`p-1.5 rounded-lg ${card.iconColor} group-hover:scale-110 transition-transform`}>
              {ICONS[card.key]}
            </span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {card.format(values[card.key])}
          </div>
        </div>
      ))}
    </div>
  )
}
