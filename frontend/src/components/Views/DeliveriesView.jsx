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

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtCompact(value) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return fmt(value)
}

// ── Hero KPI ──────────────────────────────────────────────────────────────────
function HeroKpi({ label, value, sub, color, tooltip, icon }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
      {/* glow blob */}
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl opacity-20"
        style={{ background: color }}
      />

      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500">
            {label}
            {tooltip && <Tooltip content={tooltip} />}
          </span>
          <span className="text-lg opacity-60" role="img" aria-hidden>{icon}</span>
        </div>
        <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</div>
        {sub && <div className="mt-1 text-[11px] text-gray-500">{sub}</div>}
      </div>
    </div>
  )
}

// ── Animated bar ──────────────────────────────────────────────────────────────
function AnimatedBar({ pct, color }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ── Ranked list ───────────────────────────────────────────────────────────────
function RankedList({ title, items, formatter, color, tooltip }) {
  const max = Math.max(...items.map((i) => i.value), 0)

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">{title}</h3>
        {tooltip && <Tooltip content={tooltip} />}
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] text-gray-600">Sem dados suficientes.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                    style={{ background: `${color}15`, color }}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-[12px] text-gray-700 dark:text-gray-400">{item.label}</span>
                </div>
                <span className="shrink-0 text-[12px] font-semibold text-gray-900 dark:text-white">{formatter(item.value)}</span>
              </div>
              <AnimatedBar pct={max > 0 ? (item.value / max) * 100 : 0} color={color} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ROI spotlight card ────────────────────────────────────────────────────────
function RoiSpotlight({ items }) {
  const top = items.filter((i) => i.roi != null).sort((a, b) => b.roi - a.roi).slice(0, 5)

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Top ROI</h3>
        <Tooltip content="As 5 iniciativas com maior retorno sobre investimento anual." />
      </div>

      {top.length === 0 ? (
        <p className="text-[12px] text-gray-600">Sem dados de ROI disponíveis.</p>
      ) : (
        <div className="space-y-2">
          {top.map((item) => {
            const isPositive = item.roi >= 0
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.03] bg-white/[0.01] px-3 py-2"
              >
                <div className="min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-[#3DB7F4]/80 hover:text-[#3DB7F4] transition-colors"
                  >
                    {item.key}
                  </a>
                  <p className="truncate text-[10px] text-gray-600">{item.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={`text-sm font-bold ${isPositive ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}`}
                  >
                    {item.roi.toFixed(1)}%
                  </div>
                  {item.payback != null && (
                    <div className="text-[10px] text-gray-600">{item.payback.toFixed(1)} m payback</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Economy vs Cost scatter ───────────────────────────────────────────────────
function EconomyVsCost({ items }) {
  const top = items.slice(0, 8)
  const maxGains = Math.max(...top.map((i) => i.gains), 0)
  const maxCosts = Math.max(...top.map((i) => i.costs), 0)
  const max = Math.max(maxGains, maxCosts, 1)

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Economia vs Custo</h3>
        <Tooltip content="Comparativo de ganhos mensais e custos de investimento por iniciativa." />
      </div>
      <p className="mb-4 text-[10px] text-gray-600">Top 8 por economia gerada</p>

      {top.length === 0 ? (
        <p className="text-[12px] text-gray-600">Sem dados financeiros disponíveis.</p>
      ) : (
        <div className="space-y-3.5">
          {top.map((item) => (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-[#3DB7F4]/80 hover:text-[#3DB7F4] transition-colors"
                >
                  {item.key}
                </a>
                <span className="truncate text-[10px] text-gray-600 max-w-[200px]">{item.summary}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[10px] text-gray-600">Economia</span>
                  <div className="flex-1">
                    <AnimatedBar pct={(item.gains / max) * 100} color="#6BFFEB" />
                  </div>
                  <span className="w-20 shrink-0 text-right text-[10px] font-medium text-[#6BFFEB]">
                    {fmtCompact(item.gains)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[10px] text-gray-600">Custo</span>
                  <div className="flex-1">
                    <AnimatedBar pct={(item.costs / max) * 100} color="#FE70BD" />
                  </div>
                  <span className="w-20 shrink-0 text-right text-[10px] font-medium text-[#FE70BD]">
                    {fmtCompact(item.costs)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Detail table ──────────────────────────────────────────────────────────────
function DetailTable({ items }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, 8)

  return (
    <div className="rounded-xl border border-white/[0.05] bg-surface-card/50 overflow-hidden shadow-glow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Detalhamento das entregas</h3>
          <p className="text-[10px] text-gray-600 mt-0.5">{items.length} iniciativas concluídas</p>
        </div>
        {items.length > 8 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-gray-500 hover:text-white transition-colors"
          >
            {expanded ? 'Ver menos' : `Ver todas (${items.length})`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-surface-elevated/60 text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
              <th className="px-4 py-2">Jira</th>
              <th className="px-4 py-2">Entrega</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Lead time</th>
              <th className="px-4 py-2">Horas/mês</th>
              <th className="px-4 py-2">Economia</th>
              <th className="px-4 py-2">Custo</th>
              <th className="px-4 py-2">ROI</th>
              <th className="px-4 py-2">Payback</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const roi = item.metrics?.roi_percent
              const payback = item.metrics?.payback_months
              return (
                <tr key={item.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <a
                      href={item.jira_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-[#3DB7F4]/80 hover:text-[#3DB7F4] transition-colors"
                    >
                      {item.jira_key}
                    </a>
                  </td>
                  <td className="max-w-[240px] px-4 py-2.5">
                    <span className="block truncate text-[12px] text-gray-900 dark:text-gray-400">{item.summary}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-500">{item.activity_type || '—'}</td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-400">{formatDays(getLeadTimeDays(item))}</td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-400">{formatHours(getMonthlyTimeSavedHours(item))}</td>
                  <td className="px-4 py-2.5 text-[12px] font-medium text-[#6BFFEB]">
                    {fmtCompact(item.metrics?.total_gains || 0)}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-500">
                    {fmtCompact(item.metrics?.total_costs || 0)}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] font-semibold">
                    {roi != null ? (
                      <span className={roi >= 0 ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}>
                        {roi.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-700">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-400">
                    {payback != null ? `${payback.toFixed(1)} m` : <span className="text-gray-700">N/A</span>}
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-14 text-center text-sm text-gray-600">
                  Nenhuma entrega concluída encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function DeliveriesView({ initiatives }) {
  const [activityType, setActivityType] = useState('')

  const completed = useMemo(() => initiatives.filter(isCompleted), [initiatives])

  const activityTypes = useMemo(
    () => [...new Set(completed.map((i) => i.activity_type).filter(Boolean))].sort(),
    [completed]
  )

  const filtered = useMemo(
    () => completed.filter((i) => (activityType ? i.activity_type === activityType : true)),
    [completed, activityType]
  )

  // KPIs
  const totalHours = filtered.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0)
  const leadTimes = filtered.map(getLeadTimeDays).filter((v) => v != null)
  const avgLead = leadTimes.length > 0 ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length : null
  const initialInvestment = filtered.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)

  const withRoi = filtered.filter((i) => i.metrics?.roi_percent != null)
  const avgRoi = withRoi.length > 0 ? withRoi.reduce((s, i) => s + i.metrics.roi_percent, 0) / withRoi.length : null
  const accumulatedNetGains = filtered.reduce((s, i) => {
    const monthsLive = i.metrics?.months_live || 0
    // metrics?.total_gains agora reflete o Ganho Líquido Mensal (Savings - OPEX)
    return s + (i.metrics?.total_gains || 0) * monthsLive
  }, 0)

  const accumulatedRoi = initialInvestment > 0
    ? ((accumulatedNetGains - initialInvestment) / initialInvestment) * 100
    : null

  const totalGainsMonthly = filtered.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0)
  const annualEconomy = totalGainsMonthly * 12
  const byCostCenter = Object.entries(groupBy(filtered, (i) => i.cost_center || 'Sem centro'))
    .map(([label, items]) => ({ label, value: items.length }))
    .sort((a, b) => b.value - a.value)

  const byArea = Object.entries(groupBy(filtered, (i) => i.activity_type || 'Sem tipo'))
    .map(([label, items]) => ({ label, value: items.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0) }))
    .sort((a, b) => b.value - a.value)

  const roiItems = filtered
    .filter((i) => i.metrics?.roi_percent != null)
    .map((i) => ({
      key: i.jira_key,
      summary: i.summary,
      url: i.jira_url,
      roi: i.metrics.roi_percent,
      payback: i.metrics.payback_months,
    }))

  const economyVsCost = filtered
    .map((i) => ({
      key: i.jira_key,
      summary: i.summary,
      url: i.jira_url,
      gains: i.metrics?.total_gains || 0,
      costs: i.metrics?.total_costs || 0,
    }))
    .sort((a, b) => b.gains - a.gains)

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Impacto das Entregas</h2>
          <p className="mt-0.5 text-[12px] text-gray-500">
            Resultados financeiros e operacionais das iniciativas concluídas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activityType && (
            <button
              onClick={() => setActivityType('')}
              className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-gray-500 hover:text-white transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpar filtro
            </button>
          )}
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">Todos os tipos</option>
            {activityTypes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* ── Hero KPIs ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <HeroKpi
          label="Economia anual projetada"
          value={fmtCompact(annualEconomy)}
          sub={`${fmtCompact(totalGainsMonthly)}/mês`}
          color="#6BFFEB"
          icon="💰"
          tooltip="Projeção anual baseada na soma dos ganhos mensais de todas as entregas concluídas."
        />
        <HeroKpi
          label="Horas devolvidas/mês"
          value={formatHours(totalHours)}
          sub={`${filtered.length} iniciativas`}
          color="#3DB7F4"
          icon="⏱️"
          tooltip="Total de horas economizadas mensalmente considerando todas as pessoas afetadas."
        />
        <HeroKpi
          label="ROI médio"
          value={avgRoi != null ? `${avgRoi.toFixed(1)}%` : '—'}
          sub="retorno sobre investimento"
          color="#40EB4F"
          icon="📈"
          tooltip="Média do ROI das iniciativas com dados financeiros preenchidos. Fórmula: (ganhos_mensais − custos_totais) ÷ custos_totais × 100"
        />
        <HeroKpi
          label="Investimento total"
          value={fmtCompact(initialInvestment)}
          sub="custo acumulado das entregas"
          color="#FE70BD"
          icon="🏗️"
          tooltip="Soma dos custos de desenvolvimento e terceiros (CAPEX)."
        />
        <HeroKpi
          label="ROI Acumulado"
          value={accumulatedRoi != null ? `${accumulatedRoi.toFixed(1)}%` : '—'}
          sub="retorno real acumulado"
          color="#3DB7F4"
          icon="📈"
          tooltip="ROI acumulado considerando os ganhos mensais desde a data de entrega de cada iniciativa."
        />
        <HeroKpi
          label="Lead time médio"
          value={formatDays(avgLead)}
          sub="do início à conclusão"
          color="#F2F24B"
          icon="🗓️"
          tooltip="Média de dias entre a data de início e a data limite (due date) das iniciativas."
        />
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid gap-3 xl:grid-cols-3">
        <RoiSpotlight items={roiItems} />
        <RankedList
          title="Horas devolvidas por área"
          items={byArea}
          formatter={formatHours}
          color="#3DB7F4"
          tooltip="Soma das horas economizadas mensalmente por tipo de atividade."
        />
        <RankedList
          title="Entregas por centro de custo"
          items={byCostCenter}
          formatter={(v) => `${v} entrega${v !== 1 ? 's' : ''}`}
          color="#FE70BD"
          tooltip="Quantidade de iniciativas concluídas agrupadas por centro de custo."
        />
      </div>

      {/* ── Charts row 2 ── */}
      <EconomyVsCost items={economyVsCost} />

      {/* ── Detail table ── */}
      <DetailTable items={filtered} />

    </div>
  )
}
