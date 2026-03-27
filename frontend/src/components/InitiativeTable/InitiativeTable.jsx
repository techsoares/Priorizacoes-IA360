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
  { key: 'priority_order', label: '#', minWidth: 56, tooltip: 'Ordem atual de priorização da iniciativa.' },
  { key: 'jira_key', label: 'Jira', minWidth: 92, tooltip: 'Chave da issue no Jira. Clique para abrir o ticket.' },
  { key: 'summary', label: 'Iniciativa', minWidth: 280, tooltip: 'Resumo da demanda como veio do Jira. Passe o mouse para ver detalhes.' },
  { key: 'jira_status', label: 'Status', minWidth: 140, badge: true, tooltip: 'Status atual da issue no Jira.' },
  { key: 'hours_saved', label: 'Horas Econ.', minWidth: 112, tooltip: 'Tempo economizado por mês, derivado dos campos do Jira.' },
  { key: 'development_estimate_seconds', label: 'Tempo Dev', minWidth: 112, tooltip: 'Tempo estimado de desenvolvimento vindo do Jira (horas).' },
  {
    key: 'total_gains',
    label: 'Ganhos',
    minWidth: 132,
    computed: true,
    tooltip: 'Ganhos financeiros mensais estimados da iniciativa.',
  },
  {
    key: 'total_costs',
    label: 'Custos',
    minWidth: 132,
    computed: true,
    tooltip: 'Custos financeiros estimados da iniciativa.',
  },
  {
    key: 'roi_percent',
    label: 'ROI (%)',
    minWidth: 110,
    computed: true,
    tooltip: 'Retorno sobre investimento calculado a partir de ganhos e custos.',
  },
  {
    key: 'payback_months',
    label: 'Payback',
    minWidth: 116,
    computed: true,
    tooltip: 'Tempo, em meses, para recuperar o investimento estimado.',
  },
]

export default function InitiativeTable({
  initiatives,
  onReorder,
  onUpdateField,
  selectedId,
  onSelect,
}) {
  const [summaryWidth, setSummaryWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!isResizing) return undefined

    function handleMouseMove(event) {
      setSummaryWidth((previous) => {
        const next = previous + event.movementX
        return Math.min(540, Math.max(180, next))
      })
    }

    function handleMouseUp() {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const columns = useMemo(
    () =>
      COLUMNS.map((column) =>
        column.key === 'summary'
          ? { ...column, width: summaryWidth, resizable: true }
          : column
      ),
    [summaryWidth]
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = initiatives.findIndex((initiative) => initiative.id === active.id)
    const newIndex = initiatives.findIndex((initiative) => initiative.id === over.id)
    const reordered = arrayMove(initiatives, oldIndex, newIndex)
    onReorder(reordered)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] rounded-3xl border border-white/10 bg-surface-card/70 shadow-[0_0_40px_rgba(53,89,235,0.08)]">
        <table className="min-w-full table-fixed text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[linear-gradient(90deg,rgba(1,32,235,0.30),rgba(254,112,189,0.18))] backdrop-blur-sm">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap border-b border-white/8"
                  style={column.width
                    ? { width: `${column.width}px`, minWidth: `${column.minWidth}px`, maxWidth: `${column.width}px` }
                    : { minWidth: `${column.minWidth}px` }
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1">
                      {column.label}
                      <Tooltip content={column.tooltip} />
                    </span>
                    {column.resizable ? (
                      <button
                        type="button"
                        aria-label="Redimensionar coluna Iniciativa"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setIsResizing(true)
                        }}
                        className="h-5 w-1.5 cursor-col-resize rounded-full bg-white/10 transition-colors hover:bg-[#3DB7F4]/60"
                      />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <SortableContext
            items={initiatives.map((initiative) => initiative.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {initiatives.map((initiative, index) => (
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
          <div className="py-16 text-center text-gray-500">
            <svg className="mx-auto mb-3 h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nenhuma iniciativa encontrada.</p>
            <p className="mt-1 text-xs text-gray-600">Sincronize com o Jira ou ajuste os filtros.</p>
          </div>
        )}
      </div>
    </DndContext>
  )
}
