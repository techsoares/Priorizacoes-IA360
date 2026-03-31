import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useEffect, useMemo, useState } from 'react'
import Tooltip from '../UI/Tooltip'
import SortableRow from './SortableRow'

const COLUMNS = [
  { key: 'priority_order', label: '#', minWidth: 52, tooltip: 'Ordem atual de priorização da iniciativa.' },
  { key: 'jira_key', label: 'Jira', minWidth: 88, tooltip: 'Chave da issue no Jira.' },
  { key: 'summary', label: 'Iniciativa', minWidth: 280, tooltip: 'Resumo da demanda. Passe o mouse para ver detalhes.' },
  { key: 'jira_status', label: 'Status', minWidth: 130, badge: true, tooltip: 'Status atual no Jira.' },
  { key: 'hours_saved', label: 'Horas Econ.', minWidth: 105, sortable: true, tooltip: 'Tempo economizado por mês.' },
  { key: 'development_estimate_seconds', label: 'Tempo Dev', minWidth: 105, sortable: true, tooltip: 'Tempo estimado de desenvolvimento (horas).' },
  { key: 'total_gains', label: 'Ganhos/mês', minWidth: 120, computed: true, sortable: true, tooltip: 'Ganhos financeiros mensais estimados.' },
  { key: 'total_costs', label: 'Custos', minWidth: 120, computed: true, sortable: true, tooltip: 'Custos totais do investimento.' },
  { key: 'roi_percent', label: 'ROI Automação', minWidth: 125, computed: true, sortable: true, tooltip: 'ROI da automação: (ganho_mensal − custos) ÷ custos × 100. Mede se 1 mês de ganho já cobre o investimento.' },
  { key: 'payback_months', label: 'Payback', minWidth: 100, computed: true, sortable: true, tooltip: 'Meses para recuperar o investimento: custos ÷ ganhos_mensais.' },
]

function SortIcon({ direction }) {
  if (!direction) return (
    <svg className="h-3 w-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
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
  if (key === 'hours_saved') return initiative.hours_saved || 0
  if (key === 'development_estimate_seconds') return initiative.development_estimate_seconds || 0
  if (['total_gains', 'total_costs', 'roi_percent', 'roi_accumulated', 'payback_months'].includes(key)) {
    return initiative.metrics?.[key] ?? -Infinity
  }
  return initiative[key] ?? ''
}

export default function InitiativeTable({ initiatives, onReorder, onUpdateField, selectedId, onSelect }) {
  const [summaryWidth, setSummaryWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!isResizing) return undefined
    function handleMouseMove(e) {
      setSummaryWidth((prev) => Math.min(540, Math.max(180, prev + e.movementX)))
    }
    function handleMouseUp() { setIsResizing(false) }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const columns = useMemo(() =>
    COLUMNS.map((col) => col.key === 'summary' ? { ...col, width: summaryWidth, resizable: true } : col),
    [summaryWidth]
  )

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = initiatives.findIndex((i) => i.id === active.id)
    const newIndex = initiatives.findIndex((i) => i.id === over.id)
    onReorder(arrayMove(initiatives, oldIndex, newIndex))
  }

  const displayedInitiatives = useMemo(() => {
    if (!sortKey) return initiatives
    return [...initiatives].sort((a, b) => {
      const va = getSortValue(a, sortKey)
      const vb = getSortValue(b, sortKey)
      if (va === vb) return 0
      const cmp = va < vb ? -1 : 1
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [initiatives, sortKey, sortDir])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm">
        <table className="min-w-full table-fixed text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-elevated/90 backdrop-blur-sm">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 whitespace-nowrap border-b border-white/[0.04]"
                  style={column.width
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
                          onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true) }}
                          className="h-4 w-1 cursor-col-resize rounded-full bg-white/[0.06] transition-colors hover:bg-[#3DB7F4]/40"
                        />
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <SortableContext
            items={displayedInitiatives.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {displayedInitiatives.map((initiative, index) => (
                <SortableRow
                  key={initiative.id}
                  initiative={initiative}
                  index={index}
                  columns={columns}
                  onUpdateField={onUpdateField}
                  isSelected={selectedId === initiative.id}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </SortableContext>
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
    </DndContext>
  )
}
