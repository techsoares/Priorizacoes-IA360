import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import FilterBar from '../Dashboard/FilterBar'
import InitiativeDetail from '../Dashboard/InitiativeDetail'
import SummaryCards from '../Dashboard/SummaryCards'
import SprintQueuePanel from '../Dashboard/SprintQueuePanel'
import InitiativeTable from '../InitiativeTable/InitiativeTable'
import useSprintQueue from '../../hooks/useSprintQueue'

function collisionDetection(args) {
  // Prioriza detecção dentro do painel (para drops nas zonas de atividade)
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return closestCenter(args)
}

export default function DashboardView({
  initiatives,
  filteredInitiatives,
  filters,
  onFilterChange,
  onReorder,
  onUpdateField,
  isAdmin,
}) {
  const [selectedId, setSelectedId] = useState(null)
  const { queue, toast, addToQueue, removeFromQueue, reorderQueue, getQueueType } = useSprintQueue()

  const selectedInitiative = selectedId
    ? filteredInitiatives.find((i) => i.id === selectedId)
    : null

  const summaryData = selectedInitiative ? [selectedInitiative] : filteredInitiatives

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd({ active, over }) {
    if (!over) return

    const activeData = active.data.current
    const overId = String(over.id)

    // ── Item do painel sendo arrastado ──────────────────────────────────────
    if (activeData?.type === 'panel') {
      const { initiativeId } = activeData

      // Solto de volta na tabela → remove da fila
      if (!overId.startsWith('panel-')) {
        removeFromQueue(initiativeId)
        return
      }

      // Reordenação dentro do painel
      const overData = over.data.current
      if (overData?.type === 'panel') {
        const activityType = getQueueType(initiativeId)
        if (!activityType) return
        const list = queue[activityType] || []
        const oldIdx = list.findIndex((i) => i.initiative_id === initiativeId)
        const newIdx = list.findIndex((i) => i.initiative_id === overData.initiativeId)
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          reorderQueue(activityType, arrayMove(list, oldIdx, newIdx))
        }
      }
      return
    }

    // ── Item da tabela sendo arrastado ──────────────────────────────────────

    // Solto em zona do painel → adiciona à fila
    if (overId.startsWith('panel-')) {
      if (!isAdmin) return
      const initiative = filteredInitiatives.find((i) => i.id === active.id)
      if (initiative) addToQueue(initiative, initiative.activity_type)
      return
    }

    // Tabela → tabela (reordenação de linhas)
    if (active.id !== over.id) {
      const oldIdx = filteredInitiatives.findIndex((i) => i.id === active.id)
      const newIdx = filteredInitiatives.findIndex((i) => i.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        onReorder(arrayMove(filteredInitiatives, oldIdx, newIdx), active.id)
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <SummaryCards
        initiatives={summaryData}
        selectedInitiative={selectedInitiative}
        onClearSelection={() => setSelectedId(null)}
      />

      {selectedInitiative && (
        <InitiativeDetail
          initiative={selectedInitiative}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div className="mb-4 flex items-center justify-end">
        <FilterBar
          initiatives={initiatives}
          filters={filters}
          onFilterChange={onFilterChange}
          showSearch
        />
      </div>

      <div className="flex items-stretch gap-3">
        {/* Painel de próximas demandas */}
        <SprintQueuePanel
          queue={queue}
          initiatives={initiatives}
          isAdmin={isAdmin}
          toast={toast}
        />

        {/* Tabela principal */}
        <div className="min-w-0 flex-1">
          <SortableContext
            items={filteredInitiatives.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <InitiativeTable
              initiatives={filteredInitiatives}
              onUpdateField={onUpdateField}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </SortableContext>
        </div>
      </div>
    </DndContext>
  )
}
