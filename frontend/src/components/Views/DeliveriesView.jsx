import { useMemo, useState } from 'react'
import Tooltip from '../UI/Tooltip'
import {
  formatDays,
  formatHours,
  getLeadTimeDays,
  getMonthlyTimeSavedHours,
  groupBy,
  isCompleted,
} from '../../utils/initiativeInsights'

function MetricCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-surface-card/70 px-4 py-4 shadow-[0_0_28px_rgba(107,255,235,0.06)]">
      <div className="mb-2 flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">
        <span>{label}</span>
        {helper ? <Tooltip content={helper} /> : null}
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}

function BarList({ title, items, formatter, emptyText = 'Sem dados para exibir.' }) {
  const maxValue = Math.max(...items.map((item) => item.value), 0)

  return (
    <div className="rounded-3xl border border-white/10 bg-surface-card/70 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-gray-300">{item.label}</span>
                <span className="text-white">{formatter(item.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(107,255,235,0.9),rgba(155,93,229,0.9))] shadow-[0_0_16px_rgba(107,255,235,0.3)]"
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ComparisonList({ title, items }) {
  const maxValue = Math.max(
    ...items.flatMap((item) => [item.gains, item.costs]),
    0
  )

  return (
    <div className="rounded-3xl border border-white/10 bg-surface-card/70 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-gray-400">
        {title}
      </h3>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="truncate font-mono text-sm text-accent-purple-light hover:text-[#6BFFEB]"
              >
                {item.label}
              </a>
              <span className="truncate text-xs text-gray-500">{item.summary}</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Economia</span>
                  <span>{item.gains.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-[#6BFFEB] shadow-[0_0_16px_rgba(107,255,235,0.35)]"
                    style={{ width: `${maxValue > 0 ? (item.gains / maxValue) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>Custo</span>
                  <span>{item.costs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-accent-pink shadow-[0_0_16px_rgba(254,112,189,0.35)]"
                    style={{ width: `${maxValue > 0 ? (item.costs / maxValue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DeliveriesView({ initiatives }) {
  const [activityType, setActivityType] = useState('')

  const completedInitiatives = useMemo(
    () => initiatives.filter(isCompleted),
    [initiatives]
  )

  const activityTypes = useMemo(
    () =>
      [...new Set(completedInitiatives.map((item) => item.activity_type).filter(Boolean))].sort(),
    [completedInitiatives]
  )

  const filteredInitiatives = useMemo(
    () =>
      completedInitiatives.filter((item) =>
        activityType ? item.activity_type === activityType : true
      ),
    [completedInitiatives, activityType]
  )

  const leadTimes = filteredInitiatives.map(getLeadTimeDays).filter((value) => value != null)
  const averageLeadTime =
    leadTimes.length > 0
      ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length
      : null

  const totalMonthlyTimeSaved = filteredInitiatives.reduce(
    (sum, item) => sum + getMonthlyTimeSavedHours(item),
    0
  )

  const byCostCenter = Object.entries(
    groupBy(filteredInitiatives, (item) => item.cost_center || 'Sem centro de custo')
  ).map(([label, items]) => ({
    label,
    value: items.length,
  })).sort((a, b) => b.value - a.value)

  const byArea = Object.entries(
    groupBy(filteredInitiatives, (item) => item.activity_type || 'Sem tipo')
  ).map(([label, items]) => ({
    label,
    value: items.reduce((sum, item) => sum + getMonthlyTimeSavedHours(item), 0),
  })).sort((a, b) => b.value - a.value)

  const projectItems = Object.entries(
    groupBy(filteredInitiatives, (item) => item.project_key || 'Sem projeto')
  )

  const roiByProject = projectItems.map(([label, items]) => {
    const valid = items.filter((item) => item.metrics?.roi_percent != null)
    const average = valid.length > 0
      ? valid.reduce((sum, item) => sum + item.metrics.roi_percent, 0) / valid.length
      : 0
    return { label, value: average }
  }).sort((a, b) => b.value - a.value)

  const paybackByProject = projectItems.map(([label, items]) => {
    const valid = items.filter((item) => item.metrics?.payback_months != null)
    const average = valid.length > 0
      ? valid.reduce((sum, item) => sum + item.metrics.payback_months, 0) / valid.length
      : 0
    return { label, value: average }
  }).sort((a, b) => a.value - b.value)

  const economyVsCost = filteredInitiatives.map((item) => ({
    label: item.jira_key,
    summary: item.summary,
    url: item.jira_url,
    gains: item.metrics?.total_gains || 0,
    costs: item.metrics?.total_costs || 0,
  })).sort((a, b) => b.gains - a.gains)

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Visão geral das entregas</h2>
          <p className="text-sm text-gray-500">
            Apenas tickets concluídos, com foco em produtividade, ROI e payback.
          </p>
        </div>

        <select
          value={activityType}
          onChange={(event) => setActivityType(event.target.value)}
          className="rounded-full border border-white/10 bg-surface-card px-3 py-1 text-xs text-gray-300"
        >
          <option value="">Tipo de atividade</option>
          {activityTypes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          label="Entregas concluídas"
          value={filteredInitiatives.length}
          helper="Total de tickets com status Concluído após aplicar os filtros."
        />
        <MetricCard
          label="Lead time médio"
          value={formatDays(averageLeadTime)}
          helper="Diferença entre data de início e resolution date."
        />
        <MetricCard
          label="Horas devolvidas/mês"
          value={formatHours(totalMonthlyTimeSaved)}
          helper="Quantidade de envolvidos × horas devolvidas por dia × dias de execução no mês."
        />
        <MetricCard
          label="Centros de custo"
          value={byCostCenter.length}
          helper="Quantidade de centros de custo com entregas concluídas."
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <BarList
          title="Centros de custo com entregas"
          items={byCostCenter}
          formatter={(value) => `${value} entregas`}
        />
        <BarList
          title="Horas devolvidas por área"
          items={byArea}
          formatter={formatHours}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <BarList
          title="ROI por projeto"
          items={roiByProject}
          formatter={(value) => `${value.toFixed(1)}%`}
        />
        <BarList
          title="Payback por projeto"
          items={paybackByProject}
          formatter={(value) => `${value.toFixed(1)} meses`}
        />
      </div>

      <div className="mb-6">
        <ComparisonList
          title="Economia x custo de cada Jira"
          items={economyVsCost}
        />
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/10 bg-surface-card/70 p-4">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="border-b border-white/8 text-left text-[10px] uppercase tracking-[0.2em] text-gray-500">
              <th className="px-3 py-3">Jira</th>
              <th className="px-3 py-3">Entrega</th>
              <th className="px-3 py-3">Projeto</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Centro de custo</th>
              <th className="px-3 py-3">Lead time</th>
              <th className="px-3 py-3">Horas/mês</th>
              <th className="px-3 py-3">Ganhos</th>
              <th className="px-3 py-3">Custos</th>
              <th className="px-3 py-3">ROI</th>
              <th className="px-3 py-3">Payback</th>
            </tr>
          </thead>
          <tbody>
            {filteredInitiatives.map((item) => (
              <tr key={item.id} className="border-b border-white/5 text-sm text-gray-300">
                <td className="px-3 py-3">
                  <a
                    href={item.jira_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-accent-purple-light hover:text-[#6BFFEB]"
                  >
                    {item.jira_key}
                  </a>
                </td>
                <td className="max-w-[280px] px-3 py-3">
                  <span className="block truncate">{item.summary}</span>
                </td>
                <td className="px-3 py-3">{item.project_key || '—'}</td>
                <td className="px-3 py-3">{item.activity_type || '—'}</td>
                <td className="px-3 py-3">{item.cost_center || '—'}</td>
                <td className="px-3 py-3">{formatDays(getLeadTimeDays(item))}</td>
                <td className="px-3 py-3">{formatHours(getMonthlyTimeSavedHours(item))}</td>
                <td className="px-3 py-3">
                  {(item.metrics?.total_gains || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td className="px-3 py-3">
                  {(item.metrics?.total_costs || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td className="px-3 py-3">
                  {item.metrics?.roi_percent != null ? `${item.metrics.roi_percent.toFixed(1)}%` : 'N/A'}
                </td>
                <td className="px-3 py-3">
                  {item.metrics?.payback_months != null ? `${item.metrics.payback_months.toFixed(1)} meses` : 'N/A'}
                </td>
              </tr>
            ))}
            {filteredInitiatives.length === 0 && (
              <tr>
                <td colSpan={11} className="py-14 text-center text-sm text-gray-500">
                  Nenhuma entrega concluída encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
