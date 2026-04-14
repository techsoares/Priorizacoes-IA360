import { useMemo, useState } from 'react'
import Tooltip from '../UI/Tooltip'
import SortableRow from './SortableRow'

const COLUMNS = [
  { key: 'jira_key', label: 'Jira', minWidth: 88, tooltip: 'Chave da issue no Jira.' },
  { key: 'summary', label: 'Iniciativa', minWidth: 280, tooltip: 'Resumo da demanda. Passe o mouse para ver detalhes.' },
  { key: 'jira_status', label: 'Status', minWidth: 130, badge: true, tooltip: 'Status atual no Jira.' },
  { key: 'priority_final_score', label: 'Score Prioridade', minWidth: 118, computed: true, sortable: true, tooltip: 'Score geral de prioridade: base objetiva mais ajustes dos pedidos avaliados.' },
  { key: 'roi_percent', label: 'ROI Automação', minWidth: 125, computed: true, sortable: true, tooltip: 'ROI da automação: ganho mensal líquido dividido pelo investimento.' },
  { key: 'payback_months', label: 'Payback', minWidth: 100, computed: true, sortable: true, tooltip: 'Meses para recuperar o investimento.' },
  { key: 'hours_saved', label: 'Horas/mês', minWidth: 105, computed: true, sortable: true, tooltip: 'Tempo economizado por mês.' },
  { key: 'development_estimate_seconds', label: 'Tempo Dev (Est.)', minWidth: 110, sortable: true, tooltip: 'Tempo estimado de desenvolvimento em horas.' },
  { key: 'total_gains', label: 'OPEX Ganhos/mês', minWidth: 140, computed: true, sortable: true, tooltip: 'Economia operacional mensal líquida.' },
  { key: 'total_costs', label: 'CAPEX Investimento', minWidth: 140, computed: true, sortable: true, tooltip: 'Investimento técnico inicial.' },
]

const PAGE_SIZE = 25

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <svg className="h-3 w-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }

  return direction === 'asc' ? (
    <svg className="h-3 w-3 text-[#3DB7F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="h-3 w-3 text-[#3DB7F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function getSortValue(initiative, key) {
  if (key === 'priority_final_score') return Number(initiative.priority_final_score || 0)
  if (key === 'hours_saved') return initiative.metrics?.total_hours_saved ?? initiative.hours_saved ?? 0
  if (key === 'development_estimate_seconds') return initiative.development_estimate_seconds || 0
  if (['total_gains', 'total_costs', 'roi_percent', 'payback_months'].includes(key)) {
    return initiative.metrics?.[key] ?? -Infinity
  }
  return initiative[key] ?? ''
}

export default function InitiativeTable({
  initiatives,
  onUpdateField,
  selectedId,
  onSelect,
  onRequestPriority,
  expandedPriorityIds = [],
  priorityRequestsByInitiative = {},
  onTogglePriorityDetails,
  isAdmin = false,
  onDeleteRequest,
}) {
  const [summaryWidth, setSummaryWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const [showAll, setShowAll] = useState(false)

  const columns = useMemo(
    () => COLUMNS.map((column) => (
      column.key === 'summary' ? { ...column, width: summaryWidth, resizable: true } : column
    )),
    [summaryWidth]
  )

  function handleMouseMove(event) {
    setSummaryWidth((prev) => Math.min(540, Math.max(180, prev + event.movementX)))
  }
  function handleResizeStart() {
    setIsResizing(true)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleResizeEnd)
  }
  function handleResizeEnd() {
    setIsResizing(false)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleResizeEnd)
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedInitiatives = useMemo(() => {
    if (!sortKey) return initiatives
    return [...initiatives].sort((a, b) => {
      const valueA = getSortValue(a, sortKey)
      const valueB = getSortValue(b, sortKey)
      if (valueA === valueB) return 0
      const comparison = valueA < valueB ? -1 : 1
      return sortDir === 'desc' ? -comparison : comparison
    })
  }, [initiatives, sortKey, sortDir])

  const displayedInitiatives = showAll ? sortedInitiatives : sortedInitiatives.slice(0, PAGE_SIZE)
  const hasMore = sortedInitiatives.length > PAGE_SIZE

  return (
    <div className="flex flex-col">
      <div
        className={`overflow-x-auto overflow-y-auto rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm ${
          showAll ? '' : 'max-h-[calc(100vh-280px)]'
        }`}
      >
        <table className="min-w-full table-fixed text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-elevated/90 backdrop-blur-sm">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap border-b border-white/[0.04] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500"
                  style={
                    column.width
                      ? { width: `${column.width}px`, minWidth: `${column.minWidth}px`, maxWidth: `${column.width}px` }
                      : { minWidth: `${column.minWidth}px` }
                  }
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1">
                      {column.label}
                      <Tooltip content={column.tooltip} />
                    </span>
                    <div className="flex items-center gap-1">
                      {column.sortable && (
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className="rounded p-0.5 opacity-40 transition-all hover:bg-white/[0.04] hover:opacity-100"
                        >
                          <SortIcon direction={sortKey === column.key ? sortDir : null} />
                        </button>
                      )}
                      {column.resizable && (
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.stopPropagation()
                            handleResizeStart()
                          }}
                          className="h-4 w-1 cursor-col-resize rounded-full bg-white/[0.06] transition-colors hover:bg-[#3DB7F4]/40"
                        />
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {displayedInitiatives.map((initiative) => (
              <SortableRow
                key={initiative.id}
                initiative={initiative}
                columns={columns}
                onUpdateField={onUpdateField}
                isSelected={selectedId === initiative.id}
                onSelect={onSelect}
                onRequestPriority={onRequestPriority}
                isPriorityExpanded={expandedPriorityIds.includes(initiative.id)}
                priorityRequests={priorityRequestsByInitiative[initiative.id] || []}
                onTogglePriorityDetails={onTogglePriorityDetails}
                isAdmin={isAdmin}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </tbody>
        </table>

        {initiatives.length === 0 && (
          <div className="py-20 text-center text-gray-600">
            <svg className="mx-auto mb-3 h-10 w-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nenhuma iniciativa encontrada.</p>
            <p className="mt-1 text-xs text-gray-700">Sincronize com o Jira ou ajuste os filtros.</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-2 flex justify-end px-1">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[11px] text-gray-600 transition-colors hover:text-gray-300"
          >
            {showAll ? 'Recolher' : `Mostrar todas (${sortedInitiatives.length})`}
          </button>
        </div>
      )}
    </div>
  )
}
