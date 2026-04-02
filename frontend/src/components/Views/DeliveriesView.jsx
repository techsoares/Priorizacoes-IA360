import { useMemo, useState } from 'react'
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
} from '../../utils/initiativeInsights'

// ── Color utility for dark/light mode support ──────────────────────────────
function getChartColor(colorKey, isDarkMode = true) {
  const colors = {
    green: isDarkMode ? '#40EB4F' : '#1B8E2C',      // Growth/positive
    cyan: isDarkMode ? '#3DB7F4' : '#0066CC',       // Primary accent
    pink: isDarkMode ? '#FE70BD' : '#C81E7E',       // Secondary accent
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
        <div className="text-[15px] font-bold tracking-tight text-white/90">{value}</div>
        {sub && (
          <span className="text-[10px] font-medium text-gray-500 mt-1">{sub}</span>
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
        <div className="flex items-center gap-2">
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
          <Tooltip content="Maiores ROIs acumulativos entregues até o momento." />
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
        <Tooltip content="OPEX (Ganhos): Economia mensal operacional. CAPEX (Investimento): Custo initial one-time. Quanto menor o período payback, melhor o ROI." />
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
                  <span className="text-[#6BFFEB]">{fmtCompact(item.gains)}</span>
                </div>
                <AnimatedBar pct={(item.gains / max) * 100} color="#6BFFEB" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  <span>Investimento (CAPEX)</span>
                  <span className="text-[#FE70BD]">{fmtCompact(item.costs)}</span>
                </div>
                <AnimatedBar pct={(item.costs / max) * 100} color="#FE70BD" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Analytics Charts (Simple CSS-based) ───────────────────────────────────────
function AnalyticsCharts({ items, byCostCenter, byArea, initialInvestment, totalGainsMonthly }) {
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
        <div className="space-y-3">
          {roiComparison.map(item => (
            <div key={item.key} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-gray-400 w-12 shrink-0">{item.key}</span>
              <div className="flex gap-1 flex-1">
                <div className="flex items-center gap-1">
                  <div className="h-5 rounded" style={{ width: Math.max(item.est * 2, 4) + 'px', maxWidth: '40px', background: '#3559EB' }} />
                  <span className="text-[9px] font-semibold" style={{ color: '#3559EB' }}>{item.est.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-5 rounded" style={{ width: Math.max(item.real * 2, 4) + 'px', maxWidth: '40px', background: '#40EB4F' }} />
                  <span className="text-[9px] font-semibold" style={{ color: '#40EB4F' }}>{item.real.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-gray-500 mt-3">
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ background: '#3559EB' }} /> Estimado &nbsp;
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ background: '#40EB4F' }} /> Real
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
                  style={{ width: `${(area.value / maxArea) * 100}%`, background: '#3DB7F4' }}
                />
              </div>
              <span className="text-[9px] font-semibold text-white w-16 text-right">{formatHours(area.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart 3: CAPEX x OPEX Ratio */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Investimento vs Economia (CAPEX vs OPEX/ano)</h4>
        <div className="flex items-end gap-4 h-32">
          <div className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t"
              style={{ height: (initialInvestment / Math.max(initialInvestment, totalGainsMonthly * 12)) * 100 + '%', background: '#FE70BD' }}
            />
            <span className="text-[9px] text-gray-400 mt-2">CAPEX</span>
            <span className="text-[10px] font-bold text-white">{fmtCompact(initialInvestment)}</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t"
              style={{ height: (totalGainsMonthly * 12 / Math.max(initialInvestment, totalGainsMonthly * 12)) * 100 + '%', background: '#40EB4F' }}
            />
            <span className="text-[9px] text-gray-400 mt-2">OPEX/ano</span>
            <span className="text-[10px] font-bold text-white">{fmtCompact(totalGainsMonthly * 12)}</span>
          </div>
        </div>
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
                  style={{ width: `${(center.value / maxCost) * 100}%`, background: '#F2F24B' }}
                />
              </div>
              <span className="text-[9px] font-semibold text-white w-8 text-right">{center.value}</span>
            </div>
          ))}
        </div>
      </div>
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
      default:
        return 0
    }

    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    return sortDirection === 'desc' ? -comparison : comparison
  })

  const visible = expanded ? sorted : sorted.slice(0, 10)

  function SortHeader({ label, column, align = 'left' }) {
    const isActive = sortBy === column
    const arrow = isActive ? (sortDirection === 'desc' ? '↓' : '↑') : '⋮'

    return (
      <th
        onClick={() => handleSort(column)}
        className={`px-6 py-4 cursor-pointer select-none transition-colors ${align === 'right' ? 'text-right' : ''} ${
          isActive
            ? 'bg-white/[0.04] text-white'
            : 'hover:bg-white/[0.02] text-gray-500 hover:text-gray-400'
        }`}
      >
        <div className={`flex items-center gap-2 font-bold uppercase tracking-[0.2em] text-[9px] ${align === 'right' ? 'justify-end' : ''}`}>
          {label}
          <span className="text-[10px] opacity-60">{arrow}</span>
        </div>
      </th>
    )
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-surface-card/60 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Log de Entregas</h3>
          <p className="text-[10px] text-gray-600 mt-0.5">{items.length} INICIATIVAS CONCLUÍDAS - Ganhos OPEX (economia/mês) vs Custo CAPEX (investimento one-time)</p>
        </div>
        {items.length > 10 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] font-bold text-primary-light hover:text-white transition-colors"
          >
            {expanded ? 'VER MENOS' : `VER TODAS (${items.length})`}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-white/[0.02] text-left">
              <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Key</th>
              <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Iniciativa</th>
              <SortHeader label="Lead Time" column="lead_time" />
              <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Tempo (Est. vs Real)</th>
              <SortHeader label="Variância" column="variance" />
              <SortHeader label="Economia/mês" column="gains" align="right" />
              <SortHeader label="ROI (Est. vs Real)" column="roi_real" align="right" />
              <SortHeader label="Payback" column="payback" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
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
                <tr key={item.jira_key || item.id} className="group transition-colors hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <a href={item.jira_url} target="_blank" rel="noreferrer" className="font-mono text-[11px] font-black text-primary-light hover:underline">
                      {item.jira_key}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="block truncate text-xs font-medium text-gray-300 group-hover:text-white transition-colors max-w-[300px]">
                      {item.summary}
                    </span>
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider">{item.activity_type || 'Geral'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-bold text-gray-400">{formatDays(getLeadTimeDays(item))}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-blue-400 font-semibold">{formatHours(estimatedHours)}</span>
                      {hasReal && (
                        <>
                          <span className="text-gray-600">→</span>
                          <span className="text-amber-400 font-semibold">{formatHours(spentHours)}</span>
                        </>
                      )}
                      {!hasReal && <span className="text-[10px] text-gray-600 italic">sem real</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {variance !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black" style={{ color: varianceColor }}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                        </span>
                        <span className="text-[9px] font-medium text-gray-600">{varianceStatus}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-700">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[11px] font-black text-[#6BFFEB]">{fmtCompact(item.metrics?.total_gains || 0)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      {roiEstimated != null ? (
                        <span className={`text-[10px] font-black ${roiEstimated >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                          Est: {roiEstimated.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-700">Est: —</span>
                      )}
                      {roiReal != null ? (
                        <span className={`text-[11px] font-black ${roiReal >= 0 ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}`}>
                          Real: {roiReal.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-700">Real: —</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[11px] font-bold text-gray-500">{payback != null ? `${payback.toFixed(1)}m` : '—'}</span>
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
  const [activityType, setActivityType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  try {
    const completed = Array.isArray(initiatives) ? initiatives.filter(isCompleted) : []
    const activityTypes = [...new Set(completed.map((i) => i.activity_type).filter(Boolean))].sort()
    const filtered = completed.filter((i) => {
      const matchesActivityType = activityType ? i.activity_type === activityType : true
      const matchesSearch = searchTerm ? (
        i.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.jira_key?.toLowerCase().includes(searchTerm.toLowerCase())
      ) : true
      return matchesActivityType && matchesSearch
    })

    // Secure Matrix Calculations
    const totalGainsMonthly = filtered.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0)
    const annualEconomy = totalGainsMonthly * 12
    const initialInvestment = filtered.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)
    const totalHours = filtered.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0)
    const leadTimes = filtered.map(getLeadTimeDays).filter((v) => v != null && !isNaN(v))
    const avgLead = leadTimes.length > 0 ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length : null

    const withRoi = filtered.filter((i) => i.metrics?.roi_percent != null && !isNaN(i.metrics.roi_percent))
    const avgRoi = withRoi.length > 0 ? withRoi.reduce((s, i) => s + i.metrics.roi_percent, 0) / withRoi.length : null

    // ROI Acumulado: usa months_live exato (em dias/30.44) desde a data de conclusão
    // Inclui todas as entregas com data de conclusão (resolution_date ou status_updated_at)
    // Usa CAPEX real quando time_spent_hours > 0, senão usa CAPEX estimado
    const withResolutionDate = filtered.filter((i) => i.metrics?.months_live != null)
    const matureInvestment = withResolutionDate.reduce((s, i) => {
      const hasRealTime = (i.metrics?.time_spent_hours || 0) > 0
      // Se tem tempo real gasto, usa CAPEX real (dev_real + third_party)
      if (hasRealTime) {
        const techHourCost = i.tech_hour_cost || 0
        const capexReal = (i.metrics?.time_spent_hours || 0) * techHourCost + (i.metrics?.capex_third_party_cost || 0)
        return s + capexReal
      }
      // Senão usa CAPEX estimado
      return s + (i.metrics?.total_costs || 0)
    }, 0)
    const accumulatedNetGains = withResolutionDate.reduce((s, i) => {
      const monthsLive = Number(i.metrics?.months_live || 0)
      return s + (Number(i.metrics?.total_gains || 0) * monthsLive)
    }, 0)
    const accumulatedRoi = matureInvestment > 0
      ? ((accumulatedNetGains - matureInvestment) / matureInvestment) * 100
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

    return (
      <div className="space-y-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Entregas</h2>
            <p className="text-[11px] text-gray-500">Portfólio de iniciativas concluídas, ROI acumulado e análises financeiras.</p>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative">
               <input
                 type="text"
                 placeholder="Buscar por nome ou chave Jira..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="h-10 w-56 rounded-xl border border-white/10 bg-surface-card px-4 text-[10px] font-black text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-lg"
               />
             </div>
             {activityType && (
               <button onClick={() => setActivityType('')} className="flex h-9 items-center gap-2 rounded-xl bg-white/5 px-4 text-[10px] font-black text-gray-400 hover:text-white transition-all tracking-widest">
                 LIMPAR SEGMENTO
               </button>
             )}
             {searchTerm && (
               <button onClick={() => setSearchTerm('')} className="flex h-9 items-center gap-2 rounded-xl bg-white/5 px-4 text-[10px] font-black text-gray-400 hover:text-white transition-all tracking-widest">
                 LIMPAR BUSCA
               </button>
             )}
             <div className="relative">
               <select
                 value={activityType}
                 onChange={(e) => setActivityType(e.target.value)}
                 className="h-10 w-56 rounded-xl border border-white/10 bg-surface-card px-4 text-[10px] font-black text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.2em_1.2em] bg-[right_1rem_center] bg-no-repeat uppercase tracking-widest shadow-lg"
               >
                 <option value="">FILTRAR SEGMENTO</option>
                 {activityTypes.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
               </select>
             </div>
          </div>
        </div>

        {/* KPI Pills — Dashboard style */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8 mb-6">
          <KpiPill
            label="ROI Acumulado"
            value={accumulatedRoi != null ? `${accumulatedRoi.toFixed(0)}%` : '—'}
            sub={withResolutionDate.length > 0 ? `${withResolutionDate.length} em produção` : 'Sem entregas'}
            color="#3DB7F4" highlight
            tooltip="ROI real acumulado desde conclusão. Acumula a cada mês."
          />
          <KpiPill
            label="Economia Anual"
            value={fmtCompact(annualEconomy)}
            sub={`${fmtCompact(totalGainsMonthly)}/mês`}
            color="#6BFFEB"
            tooltip="Projeção anual (OPEX mensal × 12)."
          />
          <KpiPill
            label="ROI Médio"
            value={avgRoi != null ? `${avgRoi.toFixed(0)}%` : '—'}
            sub="Por iniciativa"
            color="#40EB4F"
            tooltip="Média do ROI estimado."
          />
          <KpiPill
            label="Horas/mês"
            value={formatHours(totalHours)}
            sub="Economizadas"
            color="#3DB7F4"
            tooltip="Soma total das horas economizadas."
          />
          <KpiPill
            label="CAPEX Total"
            value={fmtCompact(initialInvestment)}
            sub="Investimento"
            color="#FE70BD"
            tooltip="Investimento ONE-TIME em desenvolvimento."
          />
          <KpiPill
            label="Lead Time"
            value={formatDays(avgLead)}
            sub="Ciclo médio"
            color="#F2F24B"
            tooltip="Tempo médio entre criação e conclusão."
          />
        </div>

        {/* Main Detail Table */}
        <DetailTable items={filtered} />

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
