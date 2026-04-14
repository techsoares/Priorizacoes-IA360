import { formatHours, getDevelopmentEstimateHours, getLeadTimeDays } from '../../utils/initiativeInsights'
import PriorityRequestsList from './PriorityRequestsList'

function formatCurrency(value) {
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

function MetricPill({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200',
    green: 'border-[#40EB4F]/20 bg-[#40EB4F]/8 text-[#40EB4F]',
    blue: 'border-[#3DB7F4]/20 bg-[#3DB7F4]/8 text-[#3DB7F4]',
  }[tone]

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-[0.12em] text-gray-500">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export default function InitiativeDetail({
  initiative,
  priorityRequests = [],
  requestsLoading = false,
  onClose,
  isAdmin = false,
  onDeleteRequest,
}) {
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

  const breakdown = initiative.priority_score_breakdown || {}
  const baseScore = Number(breakdown.base_score ?? initiative.priority_base_score ?? 0)
  const requestScore = Number(initiative.priority_request_score ?? breakdown.request_score ?? 0)
  const finalScore = Number(initiative.priority_final_score || 0)

  const showRequestsSection = requestsLoading || priorityRequests.length > 0

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-white/[0.05] bg-surface-card/60 shadow-glow-sm">
      <div className="border-b border-white/[0.04] bg-surface-elevated/60 px-5 py-3.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#40EB4F]" />
              <a
                href={initiative.jira_url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 font-mono text-[11px] font-semibold text-[#3DB7F4] transition-colors hover:text-white"
              >
                {initiative.jira_key}
              </a>
              <span className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">{initiative.summary}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <MetricPill
                label="ROI"
                value={metrics.roi_percent != null ? `${metrics.roi_percent.toFixed(1)}%` : 'N/A'}
                tone={metrics.roi_percent != null && metrics.roi_percent >= 0 ? 'green' : 'default'}
              />
              <MetricPill
                label="Payback"
                value={metrics.payback_months != null ? `${metrics.payback_months.toFixed(1)} m` : 'N/A'}
                tone="blue"
              />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar detalhe"
            className="shrink-0 rounded-lg p-1 text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid gap-0 divide-x divide-white/[0.04] md:grid-cols-2">
        <div className="p-5">
          <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-white/[0.04] text-[8px] text-gray-500">1</span>
            Cenário Atual
          </h4>
          <div className="divide-y divide-white/[0.03]">
            <Row label="Tempo economizado/dia" value={`${timeSaved.toLocaleString('pt-BR')} h/dia`} />
            <Row label="Frequência de execução" value={`${execDays.toLocaleString('pt-BR')} dias/mês`} />
            <Row label="Pessoas impactadas" value={`${people.toLocaleString('pt-BR')} pessoa${people !== 1 ? 's' : ''}`} />
            <Row label="Custo-hora médio dos profissionais afetados" value={formatCurrency(costPerHour)} />
            {initiative.activity_type && <Row label="Tipo de atividade" value={initiative.activity_type} />}
            {initiative.tool && <Row label="Ferramenta" value={initiative.tool} />}
            {initiative.assignee && (
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[11px] text-gray-500">Responsável</span>
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
            {leadTime != null && <Row label="Lead time" value={`${leadTime} dias`} />}
          </div>
        </div>

        <div className="p-5">
          <h4 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-[8px] text-[#3DB7F4]">2</span>
            Com Automação
          </h4>
          <div className="divide-y divide-white/[0.03]">
            <Row label="Horas economizadas/mês" value={formatHours(monthlyHoursSaved)} accent="text-[#3DB7F4] font-semibold" />
            <Row label="Economia mensal (horas)" value={formatCurrency(gainHours)} accent="text-[#6BFFEB]" />
            {gainHC > 0 && <Row label="Economia mensal (headcount)" value={formatCurrency(gainHC)} accent="text-[#6BFFEB]" />}
            {gainProd > 0 && <Row label="Economia mensal (produtividade)" value={formatCurrency(gainProd)} accent="text-[#6BFFEB]" />}
            <Row label="Total ganhos mensais" value={formatCurrency(metrics.total_gains)} accent="text-[#40EB4F] font-bold" />
            <Row label="Economia anual projetada" value={formatCurrency((metrics.total_gains || 0) * 12)} accent="text-[#40EB4F]" />

            <div className="pt-2">
              <div className="mb-2 mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600">Investimento</div>
            </div>

            <Row label="Custo de desenvolvimento" value={formatCurrency(devCost)} />
            {thirdPartyCost > 0 && <Row label="Custo de terceiros" value={formatCurrency(thirdPartyCost)} />}
            {Number(initiative.token_cost || 0) > 0 && <Row label="Custo tokens LLM/mês" value={formatCurrency(initiative.token_cost)} />}
            {Number(initiative.cloud_infra_cost || 0) > 0 && <Row label="Custo infra cloud/mês" value={formatCurrency(initiative.cloud_infra_cost)} />}
            <Row label="Total investimento" value={formatCurrency(metrics.total_costs)} accent="text-[#FE70BD] font-bold" />
            <Row label="Tempo dev estimado" value={formatHours(devHours)} />
          </div>
        </div>
      </div>

      {initiative.intangible_gains && (
        <div className="border-t border-white/[0.04] px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#3DB7F4]">Ganhos intangíveis</span>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-700 dark:text-gray-400">{initiative.intangible_gains}</p>
        </div>
      )}

      {showRequestsSection && (
        <div className="border-t border-white/[0.04] px-5 py-3.5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-[#F2F24B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#F2F24B]">Pedidos de prioridade</span>
                {!requestsLoading && (
                  <span className="rounded-full bg-[#F2F24B]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#F2F24B]">
                    {priorityRequests.length}
                  </span>
                )}
              </div>
            </div>

            {!requestsLoading && priorityRequests.length > 0 && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <MetricPill label="Base" value={baseScore.toFixed(1)} />
                <MetricPill
                  label="Pedidos"
                  value={`${requestScore > 0 ? '+' : ''}${requestScore.toFixed(1)}`}
                  tone={requestScore >= 0 ? 'green' : 'default'}
                />
                <MetricPill label="Final" value={finalScore.toFixed(1)} tone="blue" />
              </div>
            )}
          </div>

          <PriorityRequestsList
            requests={priorityRequests}
            loading={requestsLoading}
            isAdmin={isAdmin}
            onDelete={onDeleteRequest}
          />
        </div>
      )}
    </div>
  )
}
