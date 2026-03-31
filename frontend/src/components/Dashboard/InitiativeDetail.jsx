import { getDevelopmentEstimateHours, formatHours, getLeadTimeDays } from '../../utils/initiativeInsights'

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[12px] font-medium ${accent || 'text-gray-900 dark:text-gray-300'}`}>{value}</span>
    </div>
  )
}

export default function InitiativeDetail({ initiative, onClose }) {
  if (!initiative) return null

  const metrics = initiative.metrics || {}
  const timeSaved = Number(initiative.time_saved_per_day || 0)
  const execDays = Number(initiative.execution_days_per_month || 0)
  const people = Number(initiative.affected_people_count || 0)
  const costPerHour = Number(initiative.cost_per_hour || 0)

  const monthlyHoursSaved = timeSaved * execDays * people
  const devHours = getDevelopmentEstimateHours(initiative)
  const devCost = devHours * Number(initiative.tech_hour_cost || 0)
  const thirdPartyCost = Number(initiative.third_party_hours || 0) * Number(initiative.third_party_hour_cost || 0)
  const leadTime = getLeadTimeDays(initiative)

  const gainHours = monthlyHoursSaved * costPerHour
  const gainHC = Number(initiative.headcount_reduction || 0) * Number(initiative.monthly_employee_cost || 0)
  const gainProd = Number(initiative.productivity_increase || 0) * Number(initiative.additional_task_value || 0)

  const hasHC = gainHC > 0
  const hasProd = gainProd > 0

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-white/[0.05] bg-surface-card/60 shadow-glow-sm">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] bg-surface-elevated/60 px-5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#40EB4F]" />
          <a
            href={initiative.jira_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-mono text-[11px] font-semibold text-[#3DB7F4] hover:text-white transition-colors"
          >
            {initiative.jira_key}
          </a>
          <span className="truncate text-[13px] font-medium text-gray-900 dark:text-white">{initiative.summary}</span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content: two columns */}
      <div className="grid gap-0 divide-x divide-white/[0.04] md:grid-cols-2">

        {/* Left: Cenário Atual */}
        <div className="p-5">
          <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-white/[0.04] text-[8px] text-gray-500">1</span>
            Cenario Atual
          </h4>
          <div className="divide-y divide-white/[0.03]">
            <Row label="Tempo economizado/dia" value={`${timeSaved.toLocaleString('pt-BR')} h/dia`} />
            <Row label="Frequencia de execucao" value={`${execDays.toLocaleString('pt-BR')} dias/mes`} />
            <Row label="Pessoas impactadas" value={`${people.toLocaleString('pt-BR')} pessoa${people !== 1 ? 's' : ''}`} />
            <Row label="Custo-hora (colaborador)" value={fmt(costPerHour)} />
            {initiative.activity_type && (
              <Row label="Tipo de atividade" value={initiative.activity_type} />
            )}
            {initiative.tool && (
              <Row label="Ferramenta" value={initiative.tool} />
            )}
            {initiative.assignee && (
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[11px] text-gray-500">Responsavel</span>
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-900 dark:text-gray-300">
                  {initiative.assignee_avatar_url && (
                    <img
                      src={initiative.assignee_avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-4 w-4 rounded-full"
                    />
                  )}
                  {initiative.assignee}
                </span>
              </div>
            )}
            {leadTime != null && (
              <Row label="Lead time" value={`${leadTime} dias`} />
            )}
          </div>
        </div>

        {/* Right: Com Automacao */}
        <div className="p-5">
          <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-[8px] text-[#3DB7F4]">2</span>
            Com Automacao
          </h4>
          <div className="divide-y divide-white/[0.03]">
            <Row
              label="Horas economizadas/mes"
              value={formatHours(monthlyHoursSaved)}
              accent="text-[#3DB7F4] font-semibold"
            />
            <Row
              label="Economia mensal (horas)"
              value={fmt(gainHours)}
              accent="text-[#6BFFEB]"
            />
            {hasHC && (
              <Row
                label="Economia mensal (headcount)"
                value={fmt(gainHC)}
                accent="text-[#6BFFEB]"
              />
            )}
            {hasProd && (
              <Row
                label="Economia mensal (produtividade)"
                value={fmt(gainProd)}
                accent="text-[#6BFFEB]"
              />
            )}
            <Row
              label="Total ganhos mensais"
              value={fmt(metrics.total_gains)}
              accent="text-[#40EB4F] font-bold"
            />
            <Row
              label="Economia anual projetada"
              value={fmt((metrics.total_gains || 0) * 12)}
              accent="text-[#40EB4F]"
            />

            {/* Separator */}
            <div className="pt-2">
              <div className="mb-2 mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600">Investimento</div>
            </div>

            <Row label="Custo de desenvolvimento" value={fmt(devCost)} />
            {thirdPartyCost > 0 && (
              <Row label="Custo de terceiros" value={fmt(thirdPartyCost)} />
            )}
            {Number(initiative.token_cost || 0) > 0 && (
              <Row label="Custo tokens LLM/mes" value={fmt(initiative.token_cost)} />
            )}
            {Number(initiative.cloud_infra_cost || 0) > 0 && (
              <Row label="Custo infra cloud/mes" value={fmt(initiative.cloud_infra_cost)} />
            )}
            <Row
              label="Total investimento"
              value={fmt(metrics.total_costs)}
              accent="text-[#FE70BD] font-bold"
            />
            <Row label="Tempo dev estimado" value={formatHours(devHours)} />

            {/* ROI & Payback highlight */}
            <div className="mt-1 flex items-center gap-3 pt-3">
              <div className="flex-1 rounded-lg bg-[#40EB4F]/8 px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">ROI</div>
                <div className={`text-lg font-bold ${metrics.roi_percent != null && metrics.roi_percent >= 0 ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}`}>
                  {metrics.roi_percent != null ? `${metrics.roi_percent.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-[#3DB7F4]/8 px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Payback</div>
                <div className="text-lg font-bold text-[#3DB7F4]">
                  {metrics.payback_months != null ? `${metrics.payback_months.toFixed(1)} m` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {initiative.intangible_gains && (
        <div className="border-t border-white/[0.04] px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#3DB7F4]">Ganhos intangiveis</span>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-700 dark:text-gray-400">{initiative.intangible_gains}</p>
        </div>
      )}
    </div>
  )
}
