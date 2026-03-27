import { formatHours, getDevelopmentEstimateHours } from '../../utils/initiativeInsights'

export default function InitiativeTooltip({ initiative }) {
  const metrics = initiative.metrics || {}
  const devHours = getDevelopmentEstimateHours(initiative)

  return (
    <div className="pointer-events-none absolute left-0 top-full z-[9999] mt-2 w-[340px] rounded-xl border border-white/10 bg-[#1a1a2e] p-4 shadow-2xl">
      <div className="mb-3 text-sm font-semibold text-white">{initiative.summary}</div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[#3DB7F4]/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">ROI</div>
          <div className="text-lg font-bold text-[#3DB7F4]">
            {metrics.roi_percent != null ? `${metrics.roi_percent.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
        <div className="rounded-lg bg-[#FE70BD]/10 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Payback</div>
          <div className="text-lg font-bold text-[#FE70BD]">
            {metrics.payback_months != null ? `${metrics.payback_months.toFixed(1)} meses` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        {initiative.assignee && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Responsável</span>
            <span className="flex items-center gap-1.5 text-gray-300">
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
        {initiative.activity_type && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tipo</span>
            <span className="text-gray-300">{initiative.activity_type}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Ganhos mensais</span>
          <span className="text-gray-300">
            {metrics.total_gains != null
              ? metrics.total_gains.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Custos</span>
          <span className="text-gray-300">
            {metrics.total_costs != null
              ? metrics.total_costs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Horas economizadas</span>
          <span className="text-gray-300">
            {formatHours(
              (initiative.time_saved_per_day || 0) *
              (initiative.execution_days_per_month || 0) *
              (initiative.affected_people_count || 0)
            )} /mês
          </span>
        </div>
        {(initiative.affected_people_count || 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Pessoas envolvidas</span>
            <span className="text-gray-300">{initiative.affected_people_count}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Tempo dev</span>
          <span className="text-gray-300">{formatHours(devHours)}</span>
        </div>
        {initiative.due_date && (
          <div className="flex justify-between">
            <span className="text-gray-500">Data limite</span>
            <span className="text-gray-300">
              {new Date(initiative.due_date).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}
        {initiative.jira_status && (
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="text-gray-300">{initiative.jira_status}</span>
          </div>
        )}
      </div>
    </div>
  )
}
