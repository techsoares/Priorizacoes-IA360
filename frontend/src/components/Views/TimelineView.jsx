import { useEffect, useRef, useState } from 'react'
import FilterBar from '../Dashboard/FilterBar'
import StatusBadge from '../InitiativeTable/StatusBadge'
import InitiativeTooltip from '../UI/InitiativeTooltip'
import { getStartDate, getTimelineEndDate } from '../../utils/initiativeInsights'

function buildTimelineDays(items) {
  const starts = items.map(getStartDate).filter(Boolean)
  const ends = items.map(getTimelineEndDate).filter(Boolean)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rangeStart = starts.length
    ? new Date(Math.min(...starts.map((d) => d.getTime())))
    : new Date(today.getFullYear(), today.getMonth(), 1)

  const rangeEnd = new Date(Math.max(
    ends.length ? Math.max(...ends.map((d) => d.getTime())) : 0,
    today.getTime() + 14 * 86400000
  ))

  const days = []
  for (
    let c = new Date(rangeStart);
    c <= rangeEnd;
    c = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 1)
  ) {
    days.push(new Date(c))
  }

  return { days, rangeStart }
}

function getOffsetInDays(date, rangeStart) {
  if (!date || !rangeStart) return 0
  return Math.floor((date.getTime() - rangeStart.getTime()) / 86400000)
}

function buildMonthGroups(days) {
  const groups = []
  days.forEach((day, i) => {
    const key = `${day.getFullYear()}-${day.getMonth()}`
    if (!groups.length || groups[groups.length - 1].key !== key) {
      groups.push({
        key,
        label: day.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        start: i,
        count: 1,
      })
    } else {
      groups[groups.length - 1].count++
    }
  })
  return groups
}

const ROW_H = 36
const COL_W = 28
const LABEL_W = 420
const HEADER_H = 52

function formatDateShort(date) {
  if (!date) return '—'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function LabelRow({ initiative, rowIdx }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className={`border-r border-white/[0.04] px-3 flex items-center ${rowIdx % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
      style={{ height: ROW_H }}
    >
      <div className="grid grid-cols-[72px_1fr_55px_55px_80px] items-center gap-2 w-full text-[12px]">
        <a
          href={initiative.jira_url}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono text-[11px] text-[#3DB7F4]/80 hover:text-[#3DB7F4] transition-colors"
        >
          {initiative.jira_key}
        </a>
        <div
          className="relative min-w-0"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="truncate text-white/80 cursor-default">{initiative.summary}</p>
          <p className="truncate text-[10px] text-gray-600">{initiative.assignee || '—'}</p>
          {showTooltip && <InitiativeTooltip initiative={initiative} />}
        </div>
        <div className="text-center font-mono text-[11px] text-gray-500">
          {formatDateShort(getStartDate(initiative))}
        </div>
        <div className="text-center font-mono text-[11px] text-gray-500">
          {formatDateShort(getTimelineEndDate(initiative))}
        </div>
        <div className="min-w-0 overflow-hidden text-right">
          <StatusBadge status={initiative.jira_status} />
        </div>
      </div>
    </div>
  )
}

export default function TimelineView({ initiatives, filteredInitiatives, filters, onFilterChange }) {
  const scrollRef = useRef(null)

  const items = filteredInitiatives.filter((i) => getStartDate(i) && getTimelineEndDate(i))
  const { days, rangeStart } = buildTimelineDays(items)
  const monthGroups = buildMonthGroups(days)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = rangeStart ? getOffsetInDays(today, rangeStart) : 0
  const todayInRange = todayOffset >= 0 && todayOffset < days.length

  const totalW = days.length * COL_W

  useEffect(() => {
    if (!scrollRef.current || !todayInRange) return
    const scrollTo = todayOffset * COL_W - scrollRef.current.clientWidth / 2 + COL_W / 2
    scrollRef.current.scrollLeft = Math.max(0, scrollTo)
  }, [todayOffset, todayInRange, items.length])

  const todayLineLeft = todayOffset * COL_W + COL_W / 2

  return (
    <>
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Timeline</h2>
          <p className="text-[11px] text-gray-500">Planejamento visual por início e data de resolução.</p>
        </div>
        <FilterBar 
          initiatives={initiatives} 
          filters={filters} 
          onFilterChange={onFilterChange} 
          showSearch={true}
          showItemType={false}
        />
      </div>

      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
        {/* ── Layout: fixed labels | scrollable calendar ── */}
        <div className="flex">

          {/* ── Fixed label column ── */}
          <div className="shrink-0 z-10 bg-surface-card/80" style={{ width: LABEL_W }}>
            {/* column header */}
            <div
              className="border-b border-r border-white/[0.04] px-3 flex items-end"
              style={{ height: HEADER_H }}
            >
              <div className="grid grid-cols-[72px_1fr_55px_55px_80px] gap-2 pb-2 w-full text-[10px] uppercase tracking-[0.12em] text-gray-600">
                <span>Jira</span>
                <span>Iniciativa</span>
                <span className="text-center">Início</span>
                <span className="text-center">Limite</span>
                <span className="text-right">Status</span>
              </div>
            </div>

            {/* label rows */}
            {items.map((initiative, rowIdx) => (
              <LabelRow key={initiative.id} initiative={initiative} rowIdx={rowIdx} />
            ))}

            {items.length === 0 && (
              <div className="flex items-center justify-center border-r border-white/[0.04] px-3 text-[12px] text-gray-600" style={{ height: ROW_H * 3 }}>
                Sem iniciativas
              </div>
            )}

            {/* legend footer */}
            <div className="border-t border-r border-white/[0.04] px-3 py-2.5 flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className="h-2 w-3 rounded bg-[#40EB4F]" />
                Concluído
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className="h-2 w-3 rounded bg-[#3DB7F4]" />
                Em andamento
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className="h-2 w-3 rounded bg-[#FE70BD]" />
                Atrasado
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className="h-3 w-px bg-[#3DB7F4]/50" />
                Hoje
              </span>
            </div>
          </div>

          {/* ── Scrollable calendar ── */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="pointer-events-none sticky top-0 z-20 flex justify-end pr-2 pt-1" style={{ height: 0 }}>
              <span className="translate-y-1 rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-gray-700">
                ← scroll →
              </span>
            </div>
            <div style={{ width: totalW }}>

              {/* calendar header */}
              <div className="sticky top-0 z-10 border-b border-white/[0.04] bg-surface-card/90 backdrop-blur-sm" style={{ height: HEADER_H }}>
                {/* month row */}
                <div className="flex border-b border-white/[0.03]">
                  {monthGroups.map((g) => (
                    <div
                      key={g.key}
                      className="shrink-0 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600"
                      style={{ width: g.count * COL_W }}
                    >
                      {g.label}
                    </div>
                  ))}
                </div>
                {/* day row */}
                <div className="flex relative">
                  {todayInRange && (
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#3DB7F4]/40"
                      style={{ left: todayLineLeft }}
                    />
                  )}
                  {days.map((day, i) => {
                    const isToday = todayInRange && i === todayOffset
                    const isMon = day.getDay() === 1
                    return (
                      <div
                        key={day.toISOString()}
                        className={`shrink-0 py-1 text-center text-[9px] ${
                          isToday ? 'font-bold text-[#3DB7F4]' : isMon ? 'text-gray-500' : 'text-gray-700'
                        }`}
                        style={{ width: COL_W }}
                      >
                        {isMon || isToday ? day.getDate() : ''}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* bar rows */}
              {items.map((initiative, rowIdx) => {
                const start = getStartDate(initiative)
                const end = getTimelineEndDate(initiative)
                const startOffset = getOffsetInDays(start, rangeStart)
                const span = Math.max(1, getOffsetInDays(end, rangeStart) - startOffset + 1)
                const resolved = Boolean(initiative.resolution_date)
                const isLate = !resolved && end < today

                return (
                  <div
                    key={initiative.id}
                    className={`relative ${rowIdx % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
                    style={{ height: ROW_H }}
                  >
                    {/* today line */}
                    {todayInRange && (
                      <div
                        className="pointer-events-none absolute inset-y-0 w-px bg-[#3DB7F4]/20"
                        style={{ left: todayLineLeft }}
                      />
                    )}

                    {/* bar */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-4 rounded-full ${
                        resolved
                          ? 'bg-[#40EB4F]'
                          : isLate
                          ? 'bg-[#FE70BD]'
                          : 'bg-[#3DB7F4]'
                      }`}
                      style={{
                        left: startOffset * COL_W + 4,
                        width: Math.max(span * COL_W - 8, COL_W - 8),
                      }}
                      title={`${initiative.jira_key}: ${initiative.summary}`}
                    />
                  </div>
                )
              })}

              {/* empty state rows */}
              {items.length === 0 && (
                <div className="relative flex items-center justify-center text-[12px] text-gray-600" style={{ height: ROW_H * 3 }}>
                  {todayInRange && (
                    <div
                      className="pointer-events-none absolute inset-y-0 w-px bg-[#3DB7F4]/30"
                      style={{ left: todayLineLeft }}
                    />
                  )}
                  Nenhuma iniciativa com datas para exibir
                </div>
              )}

              {/* footer spacer to match legend height */}
              <div className="border-t border-white/[0.04]" style={{ height: 72 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
