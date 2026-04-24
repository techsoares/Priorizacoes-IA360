import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  BarChart,
  Cell,
} from 'recharts'
import FilterBar from '../Dashboard/FilterBar'
import Tooltip from '../UI/Tooltip'
import {
  formatDays,
  formatHours,
  getLeadTimeDays,
  getMonthlyTimeSavedHours,
  getTimeSpentHours,
  getTimeVariancePercent,
  getTimeVarianceStatus,
  getTimeVarianceColor,
  groupBy,
  isCompleted,
  getResolutionDate,
  getStartDate,
} from '../../utils/initiativeInsights'

// ── Color utility for dark/light mode support ──────────────────────────────
function getChartColor(colorKey, isDarkMode = true) {
  const colors = {
    green: isDarkMode ? '#40EB4F' : '#1B8E2C',      // Growth/positive
    cyan: isDarkMode ? '#3DB7F4' : '#0066CC',       // Primary accent
    pink: isDarkMode ? '#FE70BD' : '#C81E7E',       // Secondary accent
    yellow: isDarkMode ? '#F2F24B' : '#D4A520',     // Tertiary accent
  }
  return colors[colorKey] || '#999'
}

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtCompact(value) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return fmt(value)
}

function getSelectedCostCenters(filters) {
  if (Array.isArray(filters.costCenters)) {
    return filters.costCenters.filter(Boolean)
  }
  return filters.costCenter ? [filters.costCenter] : []
}

function getMonthOptions() {
  return Array.from({ length: 12 }, (_, monthIndex) => ({
    value: monthIndex,
    label: new Date(2026, monthIndex, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
  }))
}

function computeSelectedPeriodMonthsLive(item, selectedYears = [], selectedMonths = []) {
  const completionDate = getResolutionDate(item) || (item.status_updated_at ? new Date(item.status_updated_at) : null)
  if (!completionDate) return 0

  const now = new Date()
  const liveStart = completionDate > now ? now : completionDate
  const liveEnd = now

  if (liveStart >= liveEnd) return 0

  const ranges = selectedYears.flatMap((year) => {
    if (selectedMonths.length) {
      return selectedMonths.map((month) => ({
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 1),
      }))
    }

    return [{
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    }]
  })

  const overlapDays = ranges.reduce((sum, range) => {
    const overlapStart = liveStart > range.start ? liveStart : range.start
    const overlapEnd = liveEnd < range.end ? liveEnd : range.end
    const diffMs = overlapEnd - overlapStart
    return diffMs > 0 ? sum + (diffMs / (1000 * 60 * 60 * 24)) : sum
  }, 0)

  return Math.round((overlapDays / 30.44) * 10) / 10
}

// Calcula quantos meses completos (decimais) a entrega está em produção desde sua conclusão até hoje.
// Usado para o OPEX Acumulado: cada mês em produção "entrega" o valor mensal de economia.
function computeMonthsSinceCompletion(item) {
  const completionDate = getResolutionDate(item) || (item.status_updated_at ? new Date(item.status_updated_at) : null)
  if (!completionDate) return 0
  const now = new Date()
  if (completionDate >= now) return 0
  const diffMs = now - completionDate
  return diffMs / (1000 * 60 * 60 * 24 * 30.44)
}

// ── KPI Pill (matches Dashboard SummaryCards style) ──────────────────────────────────────────────────────
function KpiPill({ label, value, sub, color, tooltip, highlight }) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] p-3 transition-all bg-white/[0.02] hover:bg-white/[0.04]"
    >
      {/* Tinted background */}
      <div
        className="absolute inset-0 opacity-[0.03] transition-opacity"
        style={{ backgroundColor: color }}
      />
      {/* Glow accent */}
      <div
        className="pointer-events-none absolute -right-3 -top-3 h-10 w-10 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-40"
        style={{ background: color }}
      />

      <div className="relative">
        <div className="mb-1.5 flex items-center gap-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
          {tooltip && <Tooltip content={tooltip} />}
          {highlight && (
            <span className="rounded-full bg-primary/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-light ring-1 ring-primary/30 ml-auto">
              Novo
            </span>
          )}
        </div>
        <div className="text-[15px] font-bold tracking-tight dark:text-white/90 text-gray-900">{value}</div>
        {sub && (
          <span className="text-[10px] font-medium dark:text-gray-500 text-gray-700 mt-1">{sub}</span>
        )}
      </div>
    </div>
  )
}

// ── Visual Rank Bar ───────────────────────────────────────────────────────────
function AnimatedBar({ pct, color }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.03]">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-in-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}dd, ${color})`,
          boxShadow: `0 0 10px ${color}44`
        }}
      />
    </div>
  )
}

// ── Ranked Dashboard Column ────────────────────────────────────────────────────
function RankedList({ title, items, formatter, color, tooltip, icon }) {
  const max = Math.max(...items.map((i) => i.value), 0)

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between border-b border-white/[0.04] pb-4">
        <div className="min-w-0 space-y-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-sm ring-1 ring-white/10">
            {icon}
          </div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">{title}</h3>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <span className="text-sm text-gray-600">Sem dados suficientes</span>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item, i) => (
            <div key={item.label} className="group">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-black text-gray-600 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className="truncate text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-bold text-white opacity-80">{formatter(item.value)}</span>
              </div>
              <AnimatedBar pct={max > 0 ? (item.value / max) * 100 : 0} color={color} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ROI Spotlight Podium ──────────────────────────────────────────────────────
function RoiSpotlight({ items }) {
  const top = items.filter((i) => i.roi != null).sort((a, b) => b.roi - a.roi).slice(0, 5)

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(53,89,235,0.05),transparent)] p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between border-b border-white/[0.04] pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-sm ring-1 ring-white/10">🏆</div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">Top Performance</h3>
          <Tooltip content="Iniciativas com maior ROI estimado (ganho_mensal / CAPEX_estimado × 100). Ordenadas por retorno mensal sobre o investimento. Use como referência de quais tipos de iniciativa geram maior eficiência financeira." />
        </div>
      </div>

      <div className="space-y-3">
        {top.map((item, idx) => (
          <div
            key={item.key}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.03] bg-white/[0.01] p-3 transition-all hover:bg-white/[0.04] hover:shadow-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
               <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-lg ${
                 idx === 0 ? 'bg-gradient-to-tr from-yellow-400 to-amber-600 text-white' : 'bg-white/[0.05] text-gray-500'
               }`}>
                 {idx + 1}
               </div>
               <div className="min-w-0">
                 <a href={item.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-[11px] font-bold text-primary-light hover:underline">
                   {item.key}
                 </a>
                 <p className="truncate text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-wide">{item.summary}</p>
               </div>
            </div>
            <div className="text-right">
              <span className="block text-sm font-black text-[#40EB4F] tracking-tight">{item.roi.toFixed(0)}%</span>
              <span className="text-[9px] font-bold text-gray-600 uppercase tabular-nums">ROI</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Comparative Analytics ─────────────────────────────────────────────────────
function EconomyVsCost({ items }) {
  const top = items.slice(0, 6)
  const maxGains = Math.max(...top.map((i) => i.gains), 0)
  const maxCosts = Math.max(...top.map((i) => i.costs), 0)
  const max = Math.max(maxGains, maxCosts, 1)

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">Eficiência Financeira</h3>
          <p className="text-[10px] text-gray-600 mt-1 uppercase">Ganhos OPEX Mensais vs Investimento CAPEX (Top 6)</p>
        </div>
        <Tooltip content="OPEX (barra verde): economia mensal líquida recorrente da iniciativa. CAPEX (barra rosa): investimento one-time em desenvolvimento. Quanto maior o OPEX em relação ao CAPEX, mais rápido o payback. Iniciativas sem barra CAPEX tiveram custo zerado ou não cadastrado." />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {top.map((item) => (
          <div key={item.key} className="rounded-2xl border border-white/[0.03] bg-white/[0.01] p-4 transition-all hover:bg-white/[0.03]">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/[0.03] pb-2">
              <span className="font-mono text-[11px] font-black text-primary-light">{item.key}</span>
              <span className="truncate text-[10px] font-medium text-gray-500 uppercase">{item.summary}</span>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  <span>Economia Mensal (OPEX)</span>
                  <span style={{ color: getChartColor('cyan', document.documentElement.getAttribute('data-theme') === 'dark') }}>{fmtCompact(item.gains)}</span>
                </div>
                <AnimatedBar pct={(item.gains / max) * 100} color={getChartColor('cyan', document.documentElement.getAttribute('data-theme') === 'dark')} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  <span>Investimento (CAPEX)</span>
                  <span style={{ color: getChartColor('pink', document.documentElement.getAttribute('data-theme') === 'dark') }}>{fmtCompact(item.costs)}</span>
                </div>
                <AnimatedBar pct={(item.costs / max) * 100} color={getChartColor('pink', document.documentElement.getAttribute('data-theme') === 'dark')} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeliveryPeriodFilter({
  items,
  selectedYears,
  selectedMonths,
  onYearsChange,
  onMonthsChange,
}) {
  const availableYears = useMemo(() => {
    const years = new Set()
    items.forEach((item) => {
      const resolutionDate = getResolutionDate(item) || (item.status_updated_at ? new Date(item.status_updated_at) : null)
      if (resolutionDate) years.add(resolutionDate.getFullYear())
    })
    return [...years].sort((a, b) => b - a)
  }, [items])

  const yearDetailsRef = useRef(null)
  const monthDetailsRef = useRef(null)
  const monthOptions = useMemo(() => getMonthOptions(), [])
  const hasSelectedYears = selectedYears.length > 0
  const activeCount = selectedYears.length + selectedMonths.length
  const selectedMonthLabels = monthOptions
    .filter((month) => selectedMonths.includes(month.value))
    .map((month) => month.label)

  const yearSummary = selectedYears.length === 0
    ? 'Todos'
    : selectedYears.length <= 2
      ? selectedYears.join(', ')
      : `${selectedYears.length} anos`

  const monthSummary = !hasSelectedYears
    ? 'Selecione o ano'
    : selectedMonthLabels.length === 0
      ? 'Todos'
      : selectedMonthLabels.length <= 3
        ? selectedMonthLabels.join(', ')
        : `${selectedMonthLabels.length} meses`

  function toggleYear(year) {
    const nextYears = selectedYears.includes(year)
      ? selectedYears.filter((value) => value !== year)
      : [...selectedYears, year].sort((a, b) => b - a)

    onYearsChange(nextYears)
    if (nextYears.length === 0) {
      if (selectedMonths.length > 0) onMonthsChange([])
      if (monthDetailsRef.current) monthDetailsRef.current.removeAttribute('open')
    }
  }

  function toggleMonth(month) {
    if (!hasSelectedYears) return
    const nextMonths = selectedMonths.includes(month)
      ? selectedMonths.filter((value) => value !== month)
      : [...selectedMonths, month].sort((a, b) => a - b)
    onMonthsChange(nextMonths)
  }

  function clearAll() {
    onYearsChange([])
    onMonthsChange([])
    if (yearDetailsRef.current) yearDetailsRef.current.removeAttribute('open')
    if (monthDetailsRef.current) monthDetailsRef.current.removeAttribute('open')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="mr-1 flex items-center gap-1.5 text-[11px] text-gray-600">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Período de Entrega</span>
        <Tooltip content="Selecione um ou mais anos e, depois, um ou mais meses para filtrar as entregas concluídas." />
      </div>

      <details ref={yearDetailsRef} className="group relative">
        <summary className="flex list-none cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-left text-[11px] transition-all hover:border-white/[0.1] hover:text-gray-300">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Ano</span>
          <span className="max-w-[88px] truncate text-[11px] font-medium text-gray-300">{yearSummary}</span>
          <span className="text-[9px] text-gray-500 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-white/[0.08] bg-[#14192b] p-2 shadow-2xl">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Selecione os anos</p>
          <div className="space-y-1">
            {availableYears.map((year) => {
              const isSelected = selectedYears.includes(year)
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleYear(year)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] transition-colors ${
                    isSelected
                      ? 'bg-primary/12 text-[#3DB7F4]'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                  }`}
                >
                  <span>{year}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em]">
                    {isSelected ? 'Ativo' : 'Selecionar'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </details>

      <details ref={monthDetailsRef} className={`group relative ${hasSelectedYears ? '' : 'pointer-events-none opacity-50'}`}>
        <summary className="flex list-none cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-left text-[11px] transition-all hover:border-white/[0.1] hover:text-gray-300">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">Mês</span>
          <span className="max-w-[92px] truncate text-[11px] font-medium text-gray-300">{monthSummary}</span>
          <span className="text-[9px] text-gray-500 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-white/[0.08] bg-[#14192b] p-2 shadow-2xl">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Selecione os meses</p>
          <div className="grid grid-cols-3 gap-1">
            {monthOptions.map((month) => {
              const isSelected = selectedMonths.includes(month.value)
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => toggleMonth(month.value)}
                  className={`rounded-xl px-2 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
                    isSelected
                      ? 'bg-primary/12 text-[#3DB7F4]'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                  }`}
                >
                  {month.label}
                </button>
              )
            })}
          </div>
        </div>
      </details>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 text-[11px] text-gray-500 transition-colors hover:text-[#FE70BD]"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpar ({activeCount})
        </button>
      )}
    </div>
  )

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] px-4 py-3">
      <div className="flex flex-col gap-2">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">Período de Entrega</span>
          <Tooltip content="Selecione um ou mais anos e, depois, um ou mais meses para filtrar as entregas concluídas." />
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="self-start rounded-full border border-white/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500 transition-colors hover:border-[#FE70BD]/25 hover:text-[#FE70BD]"
          >
            Limpar período ({activeCount})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">Ano</span>
          <div className="flex flex-wrap gap-2">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => toggleYear(year)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  selectedYears.includes(year)
                    ? 'border border-primary/25 bg-primary/12 text-[#3DB7F4]'
                    : 'border border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/[0.1] hover:text-gray-300'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Mês</span>
            {!hasSelectedYears && (
              <span className="text-[10px] text-gray-600">Selecione ao menos um ano</span>
            )}
          </div>
          {hasSelectedYears ? (
          <div className="flex flex-wrap gap-2">
            {monthOptions.map((month) => {
              const isSelected = selectedMonths.includes(month.value)
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => toggleMonth(month.value)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] transition-all ${
                    isSelected
                      ? 'border border-primary/25 bg-primary/12 text-[#3DB7F4]'
                      : 'border border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/[0.1] hover:text-gray-300'
                  }`}
                >
                  {month.label}
                </button>
              )
            })}
          </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── DonutChart component (pure SVG) ─────────────────────────────────────────
function DonutChart({ slices, size = 140 }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0)
  if (total === 0) return <div style={{ width: size, height: size }} className="flex items-center justify-center text-[9px] text-gray-500">Sem dados</div>

  const r = 40, cx = 50, cy = 50
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {slices.map((sl, i) => {
        const pct = sl.value / total
        const dash = pct * circumference
        const gap = circumference - dash
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none"
            stroke={sl.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        )
        offset += dash
        return el
      })}
      <circle cx={cx} cy={cy} r="24" fill="rgba(255,255,255,0.02)" />
    </svg>
  )
}

// ── Analytics Charts (Simple CSS-based) ───────────────────────────────────────
// ── OPEX Column Chart with trend + average lines ──────────────────────────────
function calcTrend(points) {
  const n = points.length
  if (n < 2) return null
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function buildTrendSeries(data, getValue, currentMonthIndex) {
  const valid = data
    .map((d, i) => ({ x: i, y: getValue(d) }))
    .filter(p => p.y > 0 && p.x !== currentMonthIndex)
  const reg = calcTrend(valid)
  if (!reg) return data.map(() => null)
  // Extrapola para todos os 12 meses
  return data.map((_, i) => Math.max(0, reg.slope * i + reg.intercept))
}

function AvgLabel({ viewBox, value, color, align }) {
  if (!viewBox) return null
  const { x, y, width } = viewBox
  const xPos = align === 'right' ? x + width - 4 : x + 4
  const anchor = align === 'right' ? 'end' : 'start'
  return (
    <g>
      <rect
        x={xPos - (align === 'right' ? 4 : 0)}
        y={y - 16}
        width={value.length * 6.2 + 8}
        height={14}
        rx={3}
        fill="rgba(10,14,26,0.75)"
        transform={align === 'right' ? `translate(-${value.length * 6.2 + 8}, 0)` : undefined}
      />
      <text
        x={xPos}
        y={y - 6}
        fill={color}
        fontSize={10}
        fontWeight={600}
        textAnchor={anchor}
      >
        {value}
      </text>
    </g>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/[0.08] bg-surface-elevated px-3 py-2 text-[11px] shadow-xl">
      <p className="mb-1.5 font-semibold text-gray-300">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="font-medium text-white">
            {entry.name === 'OPEX' ? fmtCompact(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function OpexColumnChart({ data, isDarkMode, selectedYear, onMonthClick, selectedMonthIndex }) {
  // Médias sobre todos os meses com dados (incluindo mês atual)
  const validOpex = data.filter(d => d.opex > 0)
  const validEntregas = data.filter(d => d.deliveryCount > 0)
  const avgOpex = validOpex.length ? validOpex.reduce((s, d) => s + d.opex, 0) / validOpex.length : 0
  const avgEntregas = validEntregas.length ? validEntregas.reduce((s, d) => s + d.deliveryCount, 0) / validEntregas.length : 0

  const chartData = data.map((d, i) => ({
    name: d.monthName,
    monthIndex: i,
    OPEX: d.opex,
    Entregas: d.deliveryCount,
  }))

  const cyan = isDarkMode ? '#3DB7F4' : '#0066CC'
  const pink = isDarkMode ? '#FE70BD' : '#C81E7E'

  function handleChartClick(payload) {
    if (!payload?.activePayload?.length) return
    const monthIndex = payload.activePayload[0]?.payload?.monthIndex
    if (monthIndex == null) return
    onMonthClick(monthIndex === selectedMonthIndex ? null : monthIndex)
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="opex"
          orientation="left"
          tickFormatter={(v) => fmtCompact(v)}
          tick={{ fill: '#6b7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          tick={{ fill: '#6b7280', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        <Legend
          wrapperStyle={{ fontSize: '10px', color: '#9ca3af', paddingTop: '12px' }}
          iconType="circle"
          iconSize={8}
        />

        {/* Média OPEX */}
        <ReferenceLine
          yAxisId="opex"
          y={avgOpex}
          stroke={cyan}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          strokeOpacity={0.4}
          label={<AvgLabel value={`Ø OPEX ${fmtCompact(avgOpex)}`} color={cyan} align="left" />}
        />

        {/* Média Entregas */}
        <ReferenceLine
          yAxisId="count"
          y={avgEntregas}
          stroke={pink}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          strokeOpacity={0.4}
          label={<AvgLabel value={`Ø Ent. ${avgEntregas.toFixed(1)}`} color={pink} align="right" />}
        />

        {/* Colunas OPEX */}
        <Bar yAxisId="opex" dataKey="OPEX" radius={[4, 4, 0, 0]} maxBarSize={40}
          fill={cyan}
          fillOpacity={0.85}
        />

        {/* Colunas Entregas */}
        <Bar yAxisId="count" dataKey="Entregas" radius={[4, 4, 0, 0]} maxBarSize={20}
          fill={pink}
          fillOpacity={0.75}
        />

      </ComposedChart>
    </ResponsiveContainer>
  )
}

function EfficiencyQuadrant({ items, isDarkMode }) {
  const data = items
    .filter(i => getLeadTimeDays(i) != null && (i.metrics?.roi_percent_real ?? i.metrics?.roi_percent) != null)
    .map(i => ({
      key: i.jira_key,
      summary: i.summary,
      leadTime: getLeadTimeDays(i),
      roi: i.metrics?.roi_percent_real ?? i.metrics?.roi_percent,
    }))

  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-600 text-[11px]">Dados insuficientes para o quadrante</div>

  const avgLeadTime = data.reduce((s, i) => s + i.leadTime, 0) / data.length
  const avgRoi = data.reduce((s, i) => s + i.roi, 0) / data.length

  const cyan = isDarkMode ? '#3DB7F4' : '#0066CC'

  return (
    <div className="h-[300px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis 
            type="number" 
            dataKey="leadTime" 
            name="Lead Time" 
            unit="d" 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Tempo de Entrega (Dias)', position: 'bottom', fill: '#4b5563', fontSize: 10, offset: 0 }}
          />
          <YAxis 
            type="number" 
            dataKey="roi" 
            name="ROI" 
            unit="%" 
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'ROI (%)', angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 10, offset: 10 }}
          />
          <ZAxis type="number" range={[50, 400]} />
          <RechartsTooltip 
             content={({ active, payload }) => {
               if (!active || !payload?.length) return null
               const d = payload[0].payload
               return (
                 <div className="rounded-lg border border-white/[0.08] bg-surface-elevated px-3 py-2 text-[11px] shadow-xl">
                   <p className="font-bold text-white mb-1">{d.key}</p>
                   <p className="text-gray-400 mb-1">{d.summary}</p>
                   <div className="flex gap-4">
                     <span>Lead Time: <strong className="text-white">{d.leadTime}d</strong></span>
                     <span>ROI: <strong className="text-[#40EB4F]">{d.roi.toFixed(0)}%</strong></span>
                   </div>
                 </div>
               )
             }}
          />
          <ReferenceLine x={avgLeadTime} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" label={{ value: 'Média Lead Time', position: 'top', fill: '#6b7280', fontSize: 9 }} />
          <ReferenceLine y={avgRoi} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" label={{ value: 'Média ROI', position: 'right', fill: '#6b7280', fontSize: 9 }} />
          <Scatter name="Iniciativas" data={data} fill={cyan}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={cyan} fillOpacity={0.6} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function ValueCurveChart({ data, isDarkMode }) {
  const chartData = data.map((d, i) => {
    const prev = i > 0 ? data.slice(0, i).reduce((s, prevM) => s + prevM.opex, 0) : 0
    return {
      name: d.monthName,
      Acumulado: prev + d.opex,
      Mensal: d.opex
    }
  })

  const green = isDarkMode ? '#40EB4F' : '#1B8E2C'
  const cyan = isDarkMode ? '#3DB7F4' : '#0066CC'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
        <RechartsTooltip 
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-lg border border-white/[0.08] bg-surface-elevated px-3 py-2 text-[11px] shadow-xl">
                <p className="mb-2 font-bold text-white">{label}</p>
                {payload.map(p => (
                  <div key={p.name} className="flex justify-between gap-4">
                    <span style={{ color: p.color }}>{p.name}:</span>
                    <span className="font-mono text-white">{fmt(p.value)}</span>
                  </div>
                ))}
              </div>
            )
          }}
        />
        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
        <Line type="monotone" dataKey="Mensal" stroke={cyan} strokeWidth={1} dot={{ r: 2 }} strokeOpacity={0.5} />
        <Line type="monotone" dataKey="Acumulado" stroke={green} strokeWidth={3} dot={{ r: 4, fill: green, strokeWidth: 2, stroke: '#000' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CostCenterBenchmarking({ data }) {
  
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
        <RechartsTooltip 
           cursor={{ fill: 'rgba(255,255,255,0.05)' }}
           content={({ active, payload }) => {
             if (!active || !payload?.length) return null
             const d = payload[0].payload
             return (
               <div className="rounded-lg border border-white/[0.08] bg-surface-elevated px-3 py-2 text-[11px] shadow-xl">
                 <p className="font-bold text-white mb-1">{d.label}</p>
                 <p className="text-gray-400">Total Economia: <strong className="text-[#40EB4F]">{fmt(d.value)}</strong></p>
                 <p className="text-gray-400">ROI Médio: <strong className="text-[#3DB7F4]">{d.avgRoi.toFixed(0)}%</strong></p>
               </div>
             )
           }}
        />
        <Bar dataKey="value" fill={cyan} radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function CostCenterBenchmarkingCards({ data }) {
  const [sortBy, setSortBy] = useState('gains')

  const sortedData = useMemo(() => {
    const items = [...data]
    items.sort((a, b) => {
      if (sortBy === 'roi') return b.avgRoi - a.avgRoi
      return b.value - a.value
    })
    return items.slice(0, 8)
  }, [data, sortBy])

  const maxGains = Math.max(...sortedData.map((item) => item.value), 1)

  if (sortedData.length === 0) {
    return <div className="flex h-[320px] items-center justify-center text-[11px] text-gray-600">Sem dados suficientes</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
          Ranking visual por centro com ganhos, ROI médio e volume de iniciativas.
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSortBy('gains')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              sortBy === 'gains'
                ? 'border border-primary/25 bg-primary/12 text-[#3DB7F4]'
                : 'border border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/[0.1] hover:text-gray-300'
            }`}
          >
            Ordenar por ganhos
          </button>
          <button
            type="button"
            onClick={() => setSortBy('roi')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              sortBy === 'roi'
                ? 'border border-primary/25 bg-primary/12 text-[#3DB7F4]'
                : 'border border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/[0.1] hover:text-gray-300'
            }`}
          >
            Ordenar por ROI
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sortedData.map((item, index) => {
          const gainsWidth = Math.max((item.value / maxGains) * 100, 4)
          const roiTone = item.avgRoi >= 100 ? 'text-[#40EB4F]' : item.avgRoi >= 0 ? 'text-[#3DB7F4]' : 'text-[#FE70BD]'

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-black text-gray-400">
                    {(index + 1).toString().padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-gray-600">
                      {item.initiatives} iniciativa{item.initiatives !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-black text-white">{fmtCompact(item.value)}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-600">Ganhos</p>
                </div>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${gainsWidth}%`,
                    background: 'linear-gradient(90deg, rgba(61,183,244,0.75), rgba(61,183,244,1))',
                    boxShadow: '0 0 18px rgba(61,183,244,0.18)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-600">ROI médio</p>
                  <p className={`mt-1 text-[13px] font-bold ${roiTone}`}>{item.avgRoi.toFixed(0)}%</p>
                </div>
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-600">Ganho total</p>
                  <p className="mt-1 text-[13px] font-bold text-white">{fmtCompact(item.value)}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OpexMonthlySection({
  availableYears,
  selectedYear,
  setSelectedYear,
  selectedMonthIndex,
  setSelectedMonthIndex,
  monthlyData,
  items,
  isDarkMode,
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">OPEX Mensal + Iniciativas Entregues</h4>
          <Tooltip content="Barras azuis: economia operacional líquida mensal (soma dos ganhos das entregas concluídas naquele mês). Barras rosas: quantidade de iniciativas entregues. Clique em um mês para ver o detalhamento das entregas." />
        </div>
        <div className="flex items-center gap-1">
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                selectedYear === year
                  ? 'bg-primary/12 text-[#3DB7F4] border border-primary/25'
                  : 'border border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/[0.1] hover:text-gray-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <div className={selectedMonthIndex != null ? 'flex-1 min-w-0' : 'w-full'}>
          <OpexColumnChart
            data={monthlyData}
            isDarkMode={isDarkMode}
            selectedYear={selectedYear}
            onMonthClick={setSelectedMonthIndex}
            selectedMonthIndex={selectedMonthIndex}
          />
        </div>

        {selectedMonthIndex != null && (() => {
          const month = monthlyData[selectedMonthIndex]
          const monthItems = items.filter((item) => {
            if (!isCompleted(item)) return false
            const resDate = getResolutionDate(item) || (item.status_updated_at ? new Date(item.status_updated_at) : null)
            return resDate && resDate.getFullYear() === selectedYear && resDate.getMonth() === selectedMonthIndex
          })
          return (
            <div className="w-72 shrink-0 overflow-hidden rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm">
              <div className="flex items-center justify-between border-b border-white/[0.04] bg-surface-elevated/90 px-3 py-2 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                  {month.monthName} · {monthItems.length} entregas
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMonthIndex(null)}
                  className="text-gray-600 transition-colors hover:text-gray-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[268px] divide-y divide-white/[0.03] overflow-y-auto">
                {monthItems.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[11px] text-gray-600">Nenhuma entrega neste mês</p>
                ) : monthItems.map((item) => (
                  <div key={item.id} className="px-3 py-2 transition-colors hover:bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a
                          href={item.jira_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-[#3DB7F4]/80 transition-colors hover:text-[#3DB7F4]"
                        >
                          {item.jira_key}
                        </a>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-300">{item.summary}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-[#40EB4F]">
                        {fmtCompact(item.metrics?.total_gains || 0)}
                      </span>
                    </div>
                    {item.activity_type && (
                      <span className="mt-1 inline-block text-[9px] uppercase tracking-[0.12em] text-gray-600">
                        {item.activity_type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function AnalyticsCharts({ items, byCostCenter, byArea, initialInvestment, totalGainsMonthly }) {
  const currentYear = new Date().getFullYear()

  // Collect available years from items
  const availableYears = useMemo(() => {
    const years = new Set()
    items.forEach(item => {
      if (isCompleted(item)) {
        const resDate = getResolutionDate(item) || (item.status_updated_at ? new Date(item.status_updated_at) : null)
        if (resDate) years.add(resDate.getFullYear())
      }
    })
    if (years.size === 0) years.add(currentYear)
    return [...years].sort((a, b) => b - a)
  }, [items])

  const [selectedYear, setSelectedYear] = useState(() => currentYear)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null)

  useEffect(() => {
    if (availableYears.length === 0) return
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
      setSelectedMonthIndex(null)
    }
  }, [availableYears, selectedYear])

  // Prepare monthly data for new temporal charts
  const monthlyData = useMemo(() => {
    // Initialize 12 months
    const months = Array(12).fill(null).map((_, i) => ({
      month: i,
      monthName: new Date(selectedYear, i, 1).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      roiAccumulated: 0,
      opex: 0,
      deliveryCount: 0,
    }))

    // Aggregate data by resolution month filtered by selectedYear
    items.forEach(item => {
      if (isCompleted(item)) {
        // Try resolution_date first, then status_updated_at for completion date
        const resDate = getResolutionDate(item) || (item.status_updated_at ? new Date(item.status_updated_at) : null)
        if (resDate && resDate.getFullYear() === selectedYear) {
          const monthIndex = resDate.getMonth()
          months[monthIndex].opex += item.metrics?.total_gains || item.metrics?.monthly_gains || item.metrics?.gain || 0
          months[monthIndex].deliveryCount += 1
        }
      }
    })

    // Calculate cumulative ROI
    let accumulated = 0
    const totalAnnualOpex = months.reduce((sum, m) => sum + m.opex, 0)
    months.forEach(m => {
      const monthlyROI = totalAnnualOpex > 0 ? (m.opex / totalAnnualOpex) * 100 : 0
      accumulated += monthlyROI
      m.roiAccumulated = accumulated
    })

    return months
  }, [items, selectedYear])

  // Detect current theme mode
  const isDarkMode = document.documentElement.getAttribute('data-theme') !== 'light'

  // Chart 1: ROI Estimado vs Real (scatter-like comparison)
  const roiComparison = items
    .filter(i => i.metrics?.roi_percent != null)
    .slice(0, 5)
    .map(i => ({
      key: i.jira_key,
      est: i.metrics?.roi_percent || 0,
      real: i.metrics?.roi_percent_real || i.metrics?.roi_percent || 0,
    }))

  // Chart 2: Economy growth mock (by completion month)
  const maxArea = Math.max(...byArea.map(a => a.value), 1)
  const maxCost = Math.max(...byCostCenter.map(c => c.value), 1)

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      {/* Chart 1: ROI Comparison */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">ROI Estimado vs Real (Top 5)</h4>
        <div className="flex items-end gap-3 h-32 mt-4">
          {roiComparison.map(item => {
            const maxVal = Math.max(...roiComparison.flatMap(i => [i.est, i.real]), 1)
            return (
              <div key={item.key} className="flex-1 flex flex-col items-center gap-1">
                {/* Two bars side by side */}
                <div className="flex items-end gap-0.5 w-full h-24">
                  <div
                    className="flex-1 rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${(item.est / maxVal) * 100}%`,
                      background: getChartColor('cyan', isDarkMode),
                      minHeight: 4
                    }}
                    title={`${item.key} Estimado: ${item.est.toFixed(0)}%`}
                  />
                  <div
                    className="flex-1 rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${(item.real / maxVal) * 100}%`,
                      background: getChartColor('green', isDarkMode),
                      minHeight: 4
                    }}
                    title={`${item.key} Real: ${item.real.toFixed(0)}%`}
                  />
                </div>
                <span className="text-[8px] font-mono text-gray-400 text-center">{item.key}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[9px] text-gray-500 mt-3">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ background: getChartColor('cyan', isDarkMode) }} /> Estimado &nbsp;
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ background: getChartColor('green', isDarkMode) }} /> Real
        </p>
      </div>

      {/* Chart 2: Horas por Segmento */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Horas Economizadas por Segmento</h4>
        <div className="space-y-2">
          {byArea.slice(0, 4).map(area => (
            <div key={area.label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 truncate w-24">{area.label}</span>
              <div className="flex-1 h-4 rounded bg-white/[0.02] overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${(area.value / maxArea) * 100}%`, background: getChartColor('cyan', isDarkMode) }}
                />
              </div>
              <span className="text-[9px] font-semibold text-white w-16 text-right">{formatHours(area.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 3: CAPEX x OPEX Ratio — Donut */}
      <OpexMonthlySection
        availableYears={availableYears}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonthIndex={selectedMonthIndex}
        setSelectedMonthIndex={setSelectedMonthIndex}
        monthlyData={monthlyData}
        items={items}
        isDarkMode={isDarkMode}
      />

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Quadrante de Eficiência (Lead Time vs ROI)</h4>
        <EfficiencyQuadrant items={items} isDarkMode={isDarkMode} />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Curva de Valor Realizado (OPEX Acumulado)</h4>
        <ValueCurveChart data={monthlyData} isDarkMode={isDarkMode} />
      </div>

      {/* Chart 4: Top Cost Centers */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Iniciativas por Centro de Custo</h4>
        <div className="space-y-2">
          {byCostCenter.slice(0, 4).map(center => (
            <div key={center.label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 truncate w-24">{center.label}</span>
              <div className="flex-1 h-4 rounded bg-white/[0.02] overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${(center.value / maxCost) * 100}%`, background: getChartColor('yellow', isDarkMode) }}
                />
              </div>
              <span className="text-[9px] font-semibold text-white w-8 text-right">{center.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 xl:col-span-2">
        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-gray-300">Benchmarking por Centro de Custo (ROI & Ganhos)</h4>
        <CostCenterBenchmarkingCards
          data={Object.entries(groupBy(items, (i) => i.cost_center || 'Sem centro'))
            .map(([label, list]) => ({
              label,
              value: list.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0),
              avgRoi: list.length ? list.reduce((s, i) => s + (i.metrics?.roi_percent_real ?? i.metrics?.roi_percent ?? 0), 0) / list.length : 0,
              initiatives: list.length,
            }))
            .sort((a, b) => b.value - a.value)
          }
        />
      </div>

      {/* Chart 5: OPEX Mensal + Iniciativas Entregues (Grouped Bars) */}
      {false && (<div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">OPEX Mensal + Iniciativas Entregues</h4>
            <Tooltip content="Barras azuis: economia operacional líquida mensal (soma dos ganhos das entregas concluídas naquele mês). Barras rosas: quantidade de iniciativas entregues. Clique em um mês para ver o detalhamento das entregas." />
          </div>
          <div className="flex items-center gap-1">
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  selectedYear === year
                    ? 'bg-primary/12 text-[#3DB7F4] border border-primary/25'
                    : 'border border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/[0.1] hover:text-gray-300'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className={selectedMonthIndex != null ? 'flex-1 min-w-0' : 'w-full'}>
            <OpexColumnChart
              data={monthlyData}
              isDarkMode={isDarkMode}
              selectedYear={selectedYear}
              onMonthClick={setSelectedMonthIndex}
              selectedMonthIndex={selectedMonthIndex}
            />
          </div>

          {selectedMonthIndex != null && (() => {
            const month = monthlyData[selectedMonthIndex]
            const monthItems = items.filter(item => {
              if (!isCompleted(item)) return false
              const resDate = getResolutionDate(item) || (item.status_updated_at ? new Date(item.status_updated_at) : null)
              return resDate && resDate.getFullYear() === selectedYear && resDate.getMonth() === selectedMonthIndex
            })
            return (
              <div className="w-72 shrink-0 rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-surface-elevated/90 backdrop-blur-sm border-b border-white/[0.04]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                    {month.monthName} · {monthItems.length} entregas
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMonthIndex(null)}
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[268px] divide-y divide-white/[0.03]">
                  {monthItems.length === 0 ? (
                    <p className="px-3 py-6 text-center text-[11px] text-gray-600">Nenhuma entrega neste mês</p>
                  ) : monthItems.map(item => (
                    <div key={item.id} className="px-3 py-2 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <a
                            href={item.jira_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[10px] text-[#3DB7F4]/80 hover:text-[#3DB7F4] transition-colors"
                          >
                            {item.jira_key}
                          </a>
                          <p className="mt-0.5 text-[11px] text-gray-300 leading-snug line-clamp-2">{item.summary}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-[#40EB4F]">
                          {fmtCompact(item.metrics?.total_gains || 0)}
                        </span>
                      </div>
                      {item.activity_type && (
                        <span className="mt-1 inline-block text-[9px] uppercase tracking-[0.12em] text-gray-600">
                          {item.activity_type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>)}
    </div>
  )
}

// ── Detail Table ──────────────────────────────────────────────────────────────
function DetailTable({ items }) {
  const [expanded, setExpanded] = useState(false)
  const [sortBy, setSortBy] = useState(null)
  const [sortDirection, setSortDirection] = useState('desc')

  function handleSort(column) {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      // New column, default to descending
      setSortBy(column)
      setSortDirection('desc')
    }
  }

  const sorted = [...items].sort((a, b) => {
    if (!sortBy) return 0

    let aVal, bVal

    switch (sortBy) {
      case 'lead_time':
        aVal = getLeadTimeDays(a) || 0
        bVal = getLeadTimeDays(b) || 0
        break
      case 'variance':
        aVal = getTimeVariancePercent(a) ?? -999
        bVal = getTimeVariancePercent(b) ?? -999
        break
      case 'gains':
        aVal = a.metrics?.total_gains || 0
        bVal = b.metrics?.total_gains || 0
        break
      case 'roi_real':
        aVal = a.metrics?.roi_percent_real ?? -999
        bVal = b.metrics?.roi_percent_real ?? -999
        break
      case 'payback':
        aVal = a.metrics?.payback_months ?? 999
        bVal = b.metrics?.payback_months ?? 999
        break
      case 'resolution_date':
        aVal = getResolutionDate(a)?.getTime() || 0
        bVal = getResolutionDate(b)?.getTime() || 0
        break
      default:
        return 0
    }

    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    return sortDirection === 'desc' ? -comparison : comparison
  })

  const visible = expanded ? sorted : sorted.slice(0, 10)

  function SortHeader({ label, column, align = 'left' }) {
    const isActive = sortBy === column

    return (
      <th
        onClick={() => handleSort(column)}
        className={`px-3 py-2 cursor-pointer select-none whitespace-nowrap border-b border-white/[0.04] transition-colors text-center ${
          isActive ? 'text-[#3DB7F4]' : 'text-gray-500 hover:text-gray-400'
        }`}
      >
        <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.15em]">
          {label}
          {isActive ? (
            <svg className="h-3 w-3 text-[#3DB7F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'desc' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
            </svg>
          ) : (
            <svg className="h-3 w-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          )}
        </div>
      </th>
    )
  }

  return (
    <div className="rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm overflow-hidden">
      {/* Header — mesmo padrão do thead da tabela do dashboard */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-elevated/90 backdrop-blur-sm border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Log de Entregas</span>
          <span className="text-[10px] text-gray-700">{items.length} concluídas</span>
        </div>
        {items.length > 10 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] font-medium text-gray-500 transition-colors hover:text-[#3DB7F4]"
          >
            {expanded ? 'Ver menos' : `Ver todas (${items.length})`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-elevated/90 backdrop-blur-sm text-center">
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 whitespace-nowrap border-b border-white/[0.04]">Key</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 whitespace-nowrap border-b border-white/[0.04]">Iniciativa</th>
              <SortHeader label="Lead Time" column="lead_time" />
              <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 whitespace-nowrap border-b border-white/[0.04]">Tempo Est. vs Real</th>
              <SortHeader label="Variância" column="variance" />
              <SortHeader label="Economia/mês" column="gains" />
              <SortHeader label="ROI Est. vs Real" column="roi_real" />
              <SortHeader label="Payback" column="payback" />
              <SortHeader label="Conclusão" column="resolution_date" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {visible.map((item) => {
              const roiEstimated = item.metrics?.roi_percent
              const roiReal = item.metrics?.roi_percent_real
              const payback = item.metrics?.payback_months
              const variance = getTimeVariancePercent(item)
              const varianceStatus = getTimeVarianceStatus(variance)
              const varianceColor = getTimeVarianceColor(variance)
              const estimatedHours = item.metrics?.development_estimate_hours || 0
              const spentHours = item.metrics?.time_spent_hours || 0
              const hasReal = spentHours > 0
              return (
                <tr key={item.jira_key || item.id} className="group border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <a href={item.jira_url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-[#3DB7F4]/80 transition-colors hover:text-[#3DB7F4]">
                      {item.jira_key}
                    </a>
                  </td>
                  <td className="px-3 py-2 max-w-[280px]">
                    <span className="block truncate text-[13px] text-gray-300 group-hover:text-white transition-colors">
                      {item.summary}
                    </span>
                    <span className="text-[10px] text-gray-600 uppercase tracking-[0.12em]">{item.activity_type || 'Geral'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[13px] font-medium text-gray-300">{formatDays(getLeadTimeDays(item))}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="inline-flex items-center gap-1.5 text-[12px]">
                      <span className="font-medium text-[#3DB7F4]">{formatHours(estimatedHours)}</span>
                      {hasReal && (
                        <>
                          <span className="text-gray-600">→</span>
                          <span className="font-medium text-amber-400">{formatHours(spentHours)}</span>
                        </>
                      )}
                      {!hasReal && <span className="text-[11px] text-gray-600 italic">sem real</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {variance !== null ? (
                      <div className="inline-flex items-center gap-1">
                        <span className="text-[13px] font-semibold" style={{ color: varianceColor }}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-gray-600">{varianceStatus}</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-gray-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[13px] font-semibold text-[#40EB4F]">{fmtCompact(item.metrics?.total_gains || 0)}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      {roiEstimated != null ? (
                        <span className={`text-[11px] font-medium ${roiEstimated >= 0 ? 'text-[#3DB7F4]' : 'text-red-400'}`}>
                          Est: {roiEstimated.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-700">Est: —</span>
                      )}
                      {roiReal != null ? (
                        <span className={`text-[12px] font-semibold ${roiReal >= 0 ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}`}>
                          Real: {roiReal.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-700">Real: —</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[13px] font-medium text-gray-300">{payback != null ? `${payback.toFixed(1)} m` : '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[13px] font-medium text-gray-300">
                      {getResolutionDate(item) ? getResolutionDate(item).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function DeliveriesView({ initiatives = [] }) {
  const [filters, setFilters] = useState({
    activityType: '',
    itemType: '',
    statusOperator: 'not_equals',
    statuses: [],
    assignee: '',
    costCenterResponsible: '',
    costCenters: [],
    searchTerm: '',
    selectedYears: [],
    selectedMonths: [],
  })

  try {
    const completed = Array.isArray(initiatives) ? initiatives.filter(isCompleted) : []
    const selectedCostCenters = getSelectedCostCenters(filters)
    const filtered = completed.filter((i) => {
      if (filters.activityType && i.activity_type !== filters.activityType) return false
      if (
        filters.costCenterResponsible &&
        i.cost_center_responsible !== filters.costCenterResponsible
      ) return false
      if (selectedCostCenters.length > 0 && !selectedCostCenters.includes(i.cost_center)) return false
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        if (!i.summary?.toLowerCase().includes(term) && !i.jira_key?.toLowerCase().includes(term)) return false
      }

      const resolutionDate = getResolutionDate(i)
      if ((filters.selectedYears?.length || filters.selectedMonths?.length) && !resolutionDate) {
        return false
      }
      if (filters.selectedYears?.length && !filters.selectedYears.includes(resolutionDate.getFullYear())) {
        return false
      }
      if (filters.selectedMonths?.length && !filters.selectedMonths.includes(resolutionDate.getMonth())) {
        return false
      }

      return true
    })

    // Secure Matrix Calculations
    const totalGainsMonthly = filtered.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0)
    // OPEX Acumulado: quando há filtro de período ativo, restringe a contagem de meses ao intervalo
    // selecionado (ex: apenas meses de 2026). Sem filtro, conta da conclusão até hoje.
    const hasPeriodFilter = (filters.selectedYears?.length || 0) > 0
    const accumulatedDeliveredOpex = filtered.reduce((sum, item) => {
      const gain = Number(item.metrics?.total_gains || 0)
      if (item.is_one_time_gain) return sum + gain
      const months = hasPeriodFilter
        ? computeSelectedPeriodMonthsLive(item, filters.selectedYears, filters.selectedMonths)
        : computeMonthsSinceCompletion(item)
      return sum + gain * months
    }, 0)
    // CAPEX Total: usa CAPEX real (horas gastas × custo) quando disponível, senão estimado.
    const initialInvestment = filtered.reduce((s, i) => {
      const hasRealTime = (i.metrics?.time_spent_hours || 0) > 0
      if (hasRealTime) {
        const techHourCost = i.tech_hour_cost || 0
        return s + (
          (i.metrics?.time_spent_hours || 0) * techHourCost +
          (i.metrics?.capex_devops_cost || 0) +
          (i.metrics?.capex_third_party_cost || 0)
        )
      }
      return s + (i.metrics?.total_costs || 0)
    }, 0)
    const totalHours = filtered.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0)
    const leadTimes = filtered.map(getLeadTimeDays).filter((v) => v != null && !isNaN(v))
    const avgLead = leadTimes.length > 0 ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length : null

    const withRoi = filtered.filter((i) => (i.metrics?.roi_percent_real ?? i.metrics?.roi_percent) != null && !isNaN(i.metrics?.roi_percent_real ?? i.metrics?.roi_percent))
    const avgRoi = withRoi.length > 0 ? withRoi.reduce((s, i) => s + (i.metrics?.roi_percent_real ?? i.metrics?.roi_percent), 0) / withRoi.length : null

    // ROI Acumulado de portfolio: calculado sobre o conjunto das entregas, não somando % individuais.
    // Fórmula: ((Σ ganho_mensal × meses_em_produção) − Σ capex_real) / Σ capex_real × 100
    // Usa CAPEX real (horas gastas × custo) quando disponível, senão estimado.
    const filteredCompletedWithRuntime = filtered.filter((i) => i.metrics?.months_live != null)
    const portfolioAccumulatedGains = filteredCompletedWithRuntime.reduce((sum, item) => {
      const gain = Number(item.metrics?.total_gains || 0)
      if (item.is_one_time_gain) return sum + gain
      const monthsLive = Number(item.metrics?.months_live || 0)
      return sum + gain * monthsLive
    }, 0)
    const portfolioCapex = filteredCompletedWithRuntime.reduce((sum, item) => {
      const hasRealTime = (item.metrics?.time_spent_hours || 0) > 0
      if (hasRealTime) {
        const techHourCost = item.tech_hour_cost || 0
        return sum + (
          (item.metrics?.time_spent_hours || 0) * techHourCost +
          (item.metrics?.capex_devops_cost || 0) +
          (item.metrics?.capex_third_party_cost || 0)
        )
      }
      return sum + (item.metrics?.total_costs || 0)
    }, 0)
    const accumulatedRoi = portfolioCapex > 0
      ? ((portfolioAccumulatedGains - portfolioCapex) / portfolioCapex) * 100
      : null

    // Domain Visual Data
    const byCostCenter = Object.entries(groupBy(filtered, (i) => i.cost_center || 'Sem centro'))
      .map(([label, items]) => ({ label, value: items.length }))
      .sort((a, b) => b.value - a.value)

    const byArea = Object.entries(groupBy(filtered, (i) => i.activity_type || 'Sem tipo'))
      .map(([label, items]) => ({ label, value: items.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0) }))
      .sort((a, b) => b.value - a.value)

    const roiItems = filtered.filter((i) => i.metrics?.roi_percent != null).map((i) => ({
        key: i.jira_key || 'N/A',
        summary: i.summary || '—',
        url: i.jira_url || '#',
        roi: Number(i.metrics?.roi_percent || 0),
        payback: i.metrics?.payback_months,
      }))

    const economyVsCost = filtered.map((i) => ({
        key: i.jira_key || 'N/A',
        summary: i.summary || '—',
        url: i.jira_url || '#',
        gains: Number(i.metrics?.total_gains || 0),
        costs: Number(i.metrics?.total_costs || 0),
      })).sort((a, b) => b.gains - a.gains)

    // Domain Visual Data

    return (
      <div className="space-y-8 pb-10">
        {/* KPI Pills — Dashboard style */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8 mb-6">
          <KpiPill
            label="ROI Acumulado"
            value={accumulatedRoi != null ? `${accumulatedRoi.toFixed(0)}%` : '—'}
            sub={filteredCompletedWithRuntime.length > 0 ? `${filteredCompletedWithRuntime.length} em produção` : 'Sem entregas'}
            color="#3DB7F4" highlight
            tooltip="Retorno sobre investimento do portfólio até hoje. Fórmula: (Σ ganhos acumulados − Σ CAPEX) / Σ CAPEX × 100. Usa CAPEX real (horas registradas no Jira) quando disponível, senão estimado. Valor negativo indica que o investimento ainda não foi recuperado — consulte o Payback de cada entrega na tabela abaixo."
          />
          <KpiPill
            label="OPEX Acumulado"
            value={fmtCompact(accumulatedDeliveredOpex)}
            sub="Retornado até hoje"
            color="#6BFFEB"
            tooltip="Ganho operacional total já realizado: Σ (ganho_mensal_líquido × meses_em_produção). Com filtro de período ativo, conta apenas os meses dentro do intervalo selecionado. Sem filtro, conta da data de conclusão até hoje. Cresce diariamente conforme as entregas continuam em produção."
          />
          <KpiPill
            label="OPEX Mensal"
            value={fmtCompact(totalGainsMonthly)}
            sub="Economia recorrente"
            color="#3DB7F4"
            tooltip="Economia operacional líquida mensal das entregas filtradas. Fórmula por iniciativa: ganhos (horas_poupadas × custo/h + redução_headcount + ganho_produtividade) − custos recorrentes (horas_manutenção × custo/h + tokens + infra cloud). É o valor recorrente que entra todo mês enquanto a solução estiver no ar."
          />
          <KpiPill
            label="ROI Médio"
            value={avgRoi != null ? `${avgRoi.toFixed(0)}%` : '—'}
            sub="Por iniciativa"
            color="#40EB4F"
            tooltip="Média simples do ROI por iniciativa. Fórmula: ganho_mensal_líquido / CAPEX × 100. Usa CAPEX real (horas Jira) quando disponível, senão estimado. Representa a taxa de retorno mensal — não é anualizada. Ex: 16% significa que a iniciativa recupera 16% do investimento por mês."
          />
          <KpiPill
            label="Horas/mês"
            value={formatHours(totalHours)}
            sub="Economizadas"
            color="#3DB7F4"
            tooltip="Horas economizadas mensalmente pelas automações entregues. Fórmula por iniciativa: tempo_poupado_por_dia × dias_execução_mês × pessoas_afetadas. Soma de todas as entregas filtradas."
          />
          <KpiPill
            label="CAPEX Total"
            value={fmtCompact(initialInvestment)}
            sub="Investimento"
            color="#FE70BD"
            tooltip="Investimento one-time em desenvolvimento. Fórmula: (horas_dev × custo/hora) + (horas_devops × custo/hora) + (horas_terceiros × custo/hora). Usa horas reais registradas no Jira quando disponível; senão usa a estimativa cadastrada."
          />
          <KpiPill
            label="Lead Time"
            value={formatDays(avgLead)}
            sub="Ciclo Jira"
            color="#F2F24B"
            tooltip="Tempo médio entre criação e conclusão no Jira."
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <DeliveryPeriodFilter
            items={completed}
            selectedYears={filters.selectedYears || []}
            selectedMonths={filters.selectedMonths || []}
            onYearsChange={(selectedYears) => setFilters((current) => ({ ...current, selectedYears }))}
            onMonthsChange={(selectedMonths) => setFilters((current) => ({ ...current, selectedMonths }))}
          />

          <div className="flex min-w-0 flex-1 items-center justify-end">
          <FilterBar
            initiatives={completed}
            filters={filters}
            onFilterChange={setFilters}
            showStatus={false}
            showAssignee={false}
            showItemType={false}
            showSearch
            showPriorityToggle={false}
          />
          </div>
        </div>

        {/* Main Detail Table */}
        <DetailTable items={filtered.filter(i => i.item_type === 'Tarefa')} />

        {/* Analytics Charts */}
        <AnalyticsCharts
          items={filtered}
          byCostCenter={byCostCenter}
          byArea={byArea}
          initialInvestment={initialInvestment}
          totalGainsMonthly={totalGainsMonthly}
        />
      </div>
    )
  } catch (err) {
    console.error('Fatal render error in DeliveriesView:', err)
    return (
      <div className="p-20 text-center rounded-3xl bg-red-500/5 border border-red-500/20 shadow-glow-lg">
        <h3 className="text-xl font-black text-red-500 uppercase tracking-tighter mb-2">Diagnóstico de Falha</h3>
        <p className="text-xs text-gray-500 uppercase font-bold mb-6">DeliveriesView component caught an exception</p>
        <div className="inline-block px-4 py-2 bg-red-500/10 rounded-xl text-red-400 font-mono text-[10px] mb-6">
          {err.message}
        </div>
        <p className="text-[10px] text-gray-600 mb-6">Iniciativas recebidas: {initiatives?.length || 0}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white tracking-widest transition-all"
        >
          FORÇAR ATUALIZAÇÃO
        </button>
      </div>
    )
  }
}
