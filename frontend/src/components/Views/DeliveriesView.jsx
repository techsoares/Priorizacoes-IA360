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

// ── Premium Hero KPI Card ──────────────────────────────────────────────────────
function HeroKpi({ label, value, sub, color, tooltip, icon, highlight }) {
  return (
    <div
      className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-2xl"
      style={{
        boxShadow: `inset 0 0 20px ${color}05`,
      }}
    >
      {/* Decorative Blob */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-[40px] opacity-10 transition-opacity group-hover:opacity-20"
        style={{ background: color }}
      />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              {label}
            </span>
            {tooltip && <Tooltip content={tooltip} />}
            {highlight && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-light ring-1 ring-primary/30">
                Novo
              </span>
            )}
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-lg shadow-inner ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <div className="text-2xl font-black tracking-tight text-white dark:text-white sm:text-3xl">
            {value}
          </div>
        </div>

        {sub && (
          <div className="mt-3 flex items-center gap-1.5">
             <div className="h-1 w-1 rounded-full" style={{ background: color }} />
             <span className="text-[11px] font-medium text-gray-500">{sub}</span>
          </div>
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
          <p className="text-[10px] text-gray-600 mt-1 uppercase">Ganhos Mensais vs Investimento Inicial (Top 6)</p>
        </div>
        <Tooltip content="Comparativo direto entre o valor gerado e o custo de implantação." />
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
                  <span>Economia Mensal</span>
                  <span className="text-[#6BFFEB]">{fmtCompact(item.gains)}</span>
                </div>
                <AnimatedBar pct={(item.gains / max) * 100} color="#6BFFEB" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  <span>Investimento</span>
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

// ── Detail Table ──────────────────────────────────────────────────────────────
function DetailTable({ items }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, 10)

  return (
    <div className="rounded-[28px] border border-white/10 bg-surface-card/60 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Log de Entregas</h3>
          <p className="text-[10px] text-gray-600 mt-0.5">{items.length} INICIATIVAS CONCLUÍDAS</p>
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
            <tr className="bg-white/[0.02] text-left text-[9px] uppercase tracking-[0.2em] text-gray-500">
              <th className="px-6 py-4">Key</th>
              <th className="px-6 py-4">Iniciativa</th>
              <th className="px-6 py-4">Lead Time</th>
              <th className="px-6 py-4 text-right">Economia/mês</th>
              <th className="px-6 py-4 text-right">ROI</th>
              <th className="px-6 py-4 text-right">Payback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {visible.map((item) => {
              const roi = item.metrics?.roi_percent
              const payback = item.metrics?.payback_months
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
                  <td className="px-6 py-4 text-right">
                    <span className="text-[11px] font-black text-[#6BFFEB]">{fmtCompact(item.metrics?.total_gains || 0)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     {roi != null ? (
                       <span className={`text-[11px] font-black ${roi >= 0 ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}`}>
                         {roi.toFixed(0)}%
                       </span>
                     ) : <span className="text-gray-700">—</span>}
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

  try {
    const completed = Array.isArray(initiatives) ? initiatives.filter(isCompleted) : []
    const activityTypes = [...new Set(completed.map((i) => i.activity_type).filter(Boolean))].sort()
    const filtered = completed.filter((i) => (activityType ? i.activity_type === activityType : true))

    // Secure Matrix Calculations
    const totalGainsMonthly = filtered.reduce((s, i) => s + (i.metrics?.total_gains || 0), 0)
    const annualEconomy = totalGainsMonthly * 12
    const initialInvestment = filtered.reduce((s, i) => s + (i.metrics?.total_costs || 0), 0)
    const totalHours = filtered.reduce((s, i) => s + getMonthlyTimeSavedHours(i), 0)
    const leadTimes = filtered.map(getLeadTimeDays).filter((v) => v != null && !isNaN(v))
    const avgLead = leadTimes.length > 0 ? leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length : null

    const withRoi = filtered.filter((i) => i.metrics?.roi_percent != null && !isNaN(i.metrics.roi_percent))
    const avgRoi = withRoi.length > 0 ? withRoi.reduce((s, i) => s + i.metrics.roi_percent, 0) / withRoi.length : null

    const accumulatedNetGains = filtered.reduce((s, i) => {
      const monthsLive = Number(i.metrics?.months_live || 0)
      return s + (Number(i.metrics?.total_gains || 0) * (isNaN(monthsLive) ? 0 : monthsLive))
    }, 0)

    const accumulatedRoi = initialInvestment > 0 ? ((accumulatedNetGains - initialInvestment) / initialInvestment) * 100 : null

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
            <div className="flex items-center gap-3">
               <h2 className="text-2xl font-black text-white tracking-tight uppercase">Portfólio de Entregas</h2>
               <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary-light ring-1 ring-primary/20 tabular-nums">
                 {filtered.length} CONCLUÍDOS
               </span>
            </div>
            <p className="mt-1 text-sm font-medium text-gray-500 uppercase tracking-[0.2em]">Data Insights & Performance</p>
          </div>

          <div className="flex items-center gap-3">
             {activityType && (
               <button onClick={() => setActivityType('')} className="flex h-9 items-center gap-2 rounded-xl bg-white/5 px-4 text-[10px] font-black text-gray-400 hover:text-white transition-all tracking-widest">
                 LIMPAR
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

        {/* Hero Scoreboard */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <HeroKpi label="ROI ACUMULADO" value={accumulatedRoi != null ? `${accumulatedRoi.toFixed(0)}%` : '—'} sub="Realizado vs Investido" color="#3DB7F4" icon="🚀" highlight tooltip="ROI real gerado desde a entrega de cada iniciativa." />
          <HeroKpi label="ECONOMIA ANUAL" value={fmtCompact(annualEconomy)} sub={`${fmtCompact(totalGainsMonthly)}/mês`} color="#6BFFEB" icon="💰" tooltip="Projeção anual baseada nos ganhos mensais atuais." />
          <HeroKpi label="ROI MÉDIO" value={avgRoi != null ? `${avgRoi.toFixed(0)}%` : '—'} sub="Média por Iniciativa" color="#40EB4F" icon="📊" />
          <HeroKpi label="HORAS DEVOLVIDAS" value={formatHours(totalHours)} sub="Mensalmente" color="#3DB7F4" icon="⚡" />
          <HeroKpi label="INVESTIMENTO" value={fmtCompact(initialInvestment)} sub="Capex Total" color="#FE70BD" icon="🏗️" />
          <HeroKpi label="LEAD TIME" value={formatDays(avgLead)} sub="Ciclo Médio" color="#F2F24B" icon="🏁" />
        </div>

        {/* Analytics Section */}
        <div className="grid gap-6 xl:grid-cols-3">
          <RoiSpotlight items={roiItems} />
          <RankedList title="Horas por Segmento" items={byArea} formatter={formatHours} color="#3DB7F4" icon="📍" />
          <RankedList title="Centro de Custos" items={byCostCenter} formatter={(v) => `${v} Ativos`} color="#FE70BD" icon="🏢" />
        </div>

        <EconomyVsCost items={economyVsCost} />

        <DetailTable items={filtered} />
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
