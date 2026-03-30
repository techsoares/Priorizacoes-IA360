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
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card/60 p-6 backdrop-blur-sm"
      style={{ boxShadow: `0 0 40px ${color}18` }}
    >
      {/* glow blob */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `${color}22` }}
      />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-gray-500">
            {label}
            {tooltip && <Tooltip content={tooltip} />}
          </span>
          <span className="text-xl" role="img" aria-hidden>{icon}</span>
        </div>
        <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
        {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
      </div>
    </div>
  )
}

// ── Animated bar ──────────────────────────────────────────────────────────────
function AnimatedBar({ pct, color }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
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
    <div className="rounded-3xl border border-white/10 bg-surface-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</h3>
        {tooltip && <Tooltip content={tooltip} />}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Sem dados suficientes.</p>
      ) : (
        <div className="space-y-3.5">
          {items.map((item, i) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{ background: `${color}22`, color }}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-xs text-gray-300">{item.label}</span>
                </div>
                <span className="shrink-0 text-xs font-semibold text-white">{formatter(item.value)}</span>
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
    <div className="rounded-3xl border border-white/10 bg-surface-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Top ROI</h3>
        <Tooltip content="As 5 iniciativas com maior retorno sobre investimento anual." />
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-gray-600">Sem dados de ROI disponíveis.</p>
      ) : (
        <div className="space-y-3">
          {top.map((item) => {
            const isPositive = item.roi >= 0
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-[#3DB7F4] hover:text-[#6BFFEB] transition-colors"
                  >
                    {item.key}
                  </a>
                  <p className="truncate text-[11px] text-gray-500">{item.summary}</p>
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
    <div className="rounded-3xl border border-white/10 bg-surface-card/60 p-5 backdrop-blur-sm">
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Economia vs Custo</h3>
        <Tooltip content="Comparativo de ganhos mensais e custos de investimento por iniciativa." />
      </div>
      <p className="mb-4 text-[10px] text-gray-600">Top 8 por economia gerada</p>

      {top.length === 0 ? (
        <p className="text-sm text-gray-600">Sem dados financeiros disponíveis.</p>
      ) : (
        <div className="space-y-4">
          {top.map((item) => (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-[#3DB7F4] hover:text-[#6BFFEB] transition-colors"
                >
                  {item.key}
                </a>
                <span className="truncate text-[10px] text-gray-500 max-w-[200px]">{item.summary}</span>
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
    <div className="rounded-3xl border border-white/10 bg-surface-card/60 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Detalhamento das entregas</h3>
          <p className="text-[10px] text-gray-600 mt-0.5">{items.length} iniciativas concluídas</p>
        </div>
        {items.length > 8 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-[#3DB7F4] hover:text-[#6BFFEB] transition-colors"
          >
            {expanded ? 'Ver menos' : `Ver todas (${items.length})`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-[linear-gradient(90deg,rgba(1,32,235,0.20),rgba(254,112,189,0.12))] text-left text-[10px] uppercase tracking-[0.18em] text-gray-500">
              <th className="px-4 py-3">Jira</th>
              <th className="px-4 py-3">Entrega</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Lead time</th>
              <th className="px-4 py-3">Horas/mês</th>
              <th className="px-4 py-3">Economia</th>
              <th className="px-4 py-3">Custo</th>
              <th className="px-4 py-3">ROI</th>
              <th className="px-4 py-3">Payback</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const roi = item.metrics?.roi_percent
              const payback = item.metrics?.payback_months
              return (
                <tr key={item.id} className="border-b border-white/5 transition-colors hover:bg-[rgba(53,89,235,0.05)]">
                  <td className="px-4 py-3">
                    <a
                      href={item.jira_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-[#3DB7F4] hover:text-[#6BFFEB] transition-colors"
                    >
                      {item.jira_key}
                    </a>
                  </td>
                  <td className="max-w-[240px] px-4 py-3">
                    <span className="block truncate text-xs text-gray-300">{item.summary}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{item.activity_type || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{formatDays(getLeadTimeDays(item))}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">{formatHours(getMonthlyTimeSavedHours(item))}</td>
                  <td className="px-4 py-3 text-xs font-medium text-[#6BFFEB]">
                    {fmtCompact(item.metrics?.total_gains || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {fmtCompact(item.metrics?.total_costs || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {roi != null ? (
                      <span className={roi >= 0 ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}>
                        {roi.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {payback != null ? `${payback.toFixed(1)} m` : <span className="text-gray-600">N/A</span>}
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
  const totalEconomy = filtered.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0)
  const annualEconomy = totalEconomy * 12
  const totalCosts = filtered.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)
  const totalHours = filtered.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0)
  const leadTimes = filtered.map(getLeadTimeDays).filter((v) => v != null)
  const avgLead = leadTimes.length > 0 ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length : null
  const withRoi = filtered.filter((i) => i.metrics?.roi_percent != null)
  const avgRoi = withRoi.length > 0 ? withRoi.reduce((s, i) => s + i.metrics.roi_percent, 0) / withRoi.length : null

  // Charts data
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
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Impacto das Entregas</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Resultados financeiros e operacionais das iniciativas concluídas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activityType && (
            <button
              onClick={() => setActivityType('')}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
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
            className="rounded-full border border-white/10 bg-surface-card px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#3559EB]/50"
          >
            <option value="">Todos os tipos</option>
            {activityTypes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* ── Hero KPIs ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <HeroKpi
          label="Economia anual projetada"
          value={fmtCompact(annualEconomy)}
          sub={`${fmtCompact(totalEconomy)}/mês`}
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
          value={fmtCompact(totalCosts)}
          sub="custo acumulado das entregas"
          color="#FE70BD"
          icon="🏗️"
          tooltip="Soma dos custos de desenvolvimento, terceiros, tokens e infraestrutura."
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
      <div className="grid gap-4 xl:grid-cols-3">
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
