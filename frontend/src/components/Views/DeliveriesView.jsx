import { useMemo, useState } from 'react'
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

function CostCenterBenchmarking({ data, isDarkMode }) {
  const cyan = isDarkMode ? '#3DB7F4' : '#0066CC'
  
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
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Investimento vs Economia</h4>
        <div className="flex items-center gap-10 mt-4">
          {/* SVG Donut */}
          <DonutChart
            slices={[
              { value: initialInvestment, color: getChartColor('pink', isDarkMode), label: 'CAPEX' },
              { value: totalGainsMonthly * 12, color: getChartColor('green', isDarkMode), label: 'OPEX/ano' },
            ]}
            size={140}
          />
          {/* Legend */}
          <div className="space-y-4 text-[11px]">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: getChartColor('pink', isDarkMode) }} />
              <span className="text-gray-400 font-medium">CAPEX (Investimento): <strong className="text-white text-sm">{fmtCompact(initialInvestment)}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: getChartColor('green', isDarkMode) }} />
              <span className="text-gray-400 font-medium">OPEX/ano (Ganho anual): <strong className="text-white text-sm">{fmtCompact(totalGainsMonthly * 12)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Quadrante de Eficiência (Lead Time vs ROI)</h4>
        <EfficiencyQuadrant items={items} isDarkMode={isDarkMode} />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Curva de Valor Realizado (OPEX Acumulado)</h4>
        <ValueCurveChart data={monthlyData} isDarkMode={isDarkMode} />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-4">Benchmarking por Centro de Custo (ROI & Ganhos)</h4>
        <CostCenterBenchmarking 
          data={Object.entries(groupBy(items, (i) => i.cost_center || 'Sem centro'))
            .map(([label, list]) => ({ 
              label, 
              value: list.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0),
              avgRoi: list.length ? list.reduce((s, i) => s + (i.metrics?.roi_percent_real ?? i.metrics?.roi_percent ?? 0), 0) / list.length : 0
            }))
            .sort((a, b) => b.value - a.value)
          } 
          isDarkMode={isDarkMode} 
        />
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

      {/* Chart 5: OPEX Mensal + Iniciativas Entregues (Grouped Bars) */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">OPEX Mensal + Iniciativas Entregues</h4>
            <Tooltip content="Economia operacional mensal (OPEX) e quantidade de iniciativas entregues agrupadas por mês do ano selecionado." />
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
    costCenter: '',
    costCenters: [],
    searchTerm: '',
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
      return true
    })

    // Secure Matrix Calculations
    const totalGainsMonthly = filtered.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0)
    const annualEconomy = totalGainsMonthly * 12
    const initialInvestment = filtered.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)
    const totalHours = filtered.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0)
    const leadTimes = filtered.map(getLeadTimeDays).filter((v) => v != null && !isNaN(v))
    const avgLead = leadTimes.length > 0 ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length : null

    const withRoi = filtered.filter((i) => (i.metrics?.roi_percent_real ?? i.metrics?.roi_percent) != null && !isNaN(i.metrics?.roi_percent_real ?? i.metrics?.roi_percent))
    const avgRoi = withRoi.length > 0 ? withRoi.reduce((s, i) => s + (i.metrics?.roi_percent_real ?? i.metrics?.roi_percent), 0) / withRoi.length : null

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

    // Domain Visual Data

    return (
      <div className="space-y-8 pb-10">
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
            tooltip="Média do ROI real das iniciativas concluídas."
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
            sub="Ciclo Jira"
            color="#F2F24B"
            tooltip="Tempo médio entre criação e conclusão no Jira."
          />
        </div>

        {/* Filtros */}
        <div className="flex items-center justify-end">
          <FilterBar
            initiatives={completed}
            filters={filters}
            onFilterChange={setFilters}
            showStatus={false}
            showAssignee={false}
            showItemType={false}
            showSearch
          />
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
