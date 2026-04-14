import { useMemo, useState } from 'react'
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
import PriorityRequestModal from '../Dashboard/PriorityRequestModal'
import SummaryCards from '../Dashboard/SummaryCards'
import SprintQueuePanel from '../Dashboard/SprintQueuePanel'
import InitiativeTable from '../InitiativeTable/InitiativeTable'
import useSprintQueue from '../../hooks/useSprintQueue'
import usePriorityRequests from '../../hooks/usePriorityRequests'
import { deletePriorityRequest } from '../../services/api'

function collisionDetection(args) {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return closestCenter(args)
}

function FeedbackBanner({ feedback }) {
  if (!feedback) return null
  const isError = feedback.type === 'error'
  return (
    <div className={`mb-4 rounded-lg border px-4 py-2 text-[12px] ${
      isError
        ? 'border-[#FE70BD]/20 bg-[#FE70BD]/10 text-[#FE70BD]'
        : 'border-[#40EB4F]/20 bg-[#40EB4F]/10 text-[#40EB4F]'
    }`}>
      {feedback.message}
    </div>
  )
}

export default function DashboardView({
  initiatives,
  filteredInitiatives,
  filters,
  onFilterChange,
  onUpdateField,
  onInitiativePatched,
  isAdmin,
}) {
  const [selectedId, setSelectedId] = useState(null)
  const [priorityInitiative, setPriorityInitiative] = useState(null)
  const [expandedPriorityIds, setExpandedPriorityIds] = useState([])
  const [requestFeedback, setRequestFeedback] = useState(null)

  const {
    requestsMap,
    loading: requestsLoading,
    enrichInitiative,
    refreshAll,
    removeRequestLocally,
    upsertRequestLocally,
  } = usePriorityRequests()

  const { queue, toast, addToQueue, removeFromQueue, reorderQueue, getQueueType } = useSprintQueue()

  const enrichedInitiatives = useMemo(
    () => filteredInitiatives.map(enrichInitiative),
    [filteredInitiatives, enrichInitiative]
  )

  const selectedInitiative = selectedId
    ? enrichInitiative(filteredInitiatives.find((initiative) => initiative.id === selectedId))
    : null

  const summaryData = selectedInitiative ? [selectedInitiative] : enrichedInitiatives

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function showFeedback(message, type = 'success') {
    setRequestFeedback({ message, type })
    setTimeout(() => setRequestFeedback(null), 2500)
  }

  function handleDragEnd({ active, over }) {
    if (!over) return

    const activeData = active.data.current
    const overId = String(over.id)

    // Reordenação interna do painel (admin)
    if (activeData?.type === 'panel') {
      const { initiativeId } = activeData
      if (!overId.startsWith('panel-')) {
        removeFromQueue(initiativeId)
        return
      }

      const overData = over.data.current
      if (overData?.type === 'panel') {
        const activityType = getQueueType(initiativeId)
        if (!activityType) return
        const list = queue[activityType] || []
        const oldIndex = list.findIndex((item) => item.initiative_id === initiativeId)
        const newIndex = list.findIndex((item) => item.initiative_id === overData.initiativeId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderQueue(activityType, arrayMove(list, oldIndex, newIndex))
        }
      }
      return
    }

    // Linha da tabela solta no painel (somente admin)
    if (overId.startsWith('panel-')) {
      if (!isAdmin) return
      const initiative = filteredInitiatives.find((item) => item.id === active.id)
      if (initiative) addToQueue(initiative, initiative.activity_type)
    }
  }

  async function handleDeleteRequest(requestId) {
    removeRequestLocally(requestId)
    setRequestFeedback({ message: 'Excluindo pedido de prioridade...', type: 'success' })

    try {
      const result = await deletePriorityRequest(requestId)
      if (result?.initiative) {
        onInitiativePatched?.(result.initiative)
      }
      showFeedback('Pedido de prioridade excluído.')
      refreshAll()
    } catch (err) {
      console.error('Erro ao excluir pedido:', err)
      showFeedback('Não foi possível excluir o pedido.', 'error')
      await refreshAll()
    }
  }

  function handleTogglePriorityDetails(initiativeId) {
    setExpandedPriorityIds((prev) => (
      prev.includes(initiativeId)
        ? prev.filter((id) => id !== initiativeId)
        : [...prev, initiativeId]
    ))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
      <SummaryCards
        initiatives={summaryData}
        selectedInitiative={selectedInitiative}
        onClearSelection={() => setSelectedId(null)}
      />

      <FeedbackBanner feedback={requestFeedback} />

      {selectedInitiative && (
        <InitiativeDetail
          initiative={selectedInitiative}
          priorityRequests={requestsMap[selectedInitiative.id] || []}
          requestsLoading={requestsLoading}
          onClose={() => setSelectedId(null)}
          isAdmin={isAdmin}
          onDeleteRequest={handleDeleteRequest}
        />
      )}

      {priorityInitiative && (
        <PriorityRequestModal
          initiative={priorityInitiative}
          initiativeRequests={requestsMap[priorityInitiative.id] || []}
          onClose={() => setPriorityInitiative(null)}
          onSubmitted={async (result) => {
            if (result?.request) {
              upsertRequestLocally(result.request)
            }
            if (result?.initiative) {
              onInitiativePatched?.(result.initiative)
            }
            showFeedback('Pedido de prioridade atualizado.')
            await refreshAll()
            setExpandedPriorityIds((prev) => (
              prev.includes(priorityInitiative.id) ? prev : [...prev, priorityInitiative.id]
            ))
          }}
        />
      )}

      <div className="mb-4 flex items-center justify-end">
        <FilterBar
          initiatives={initiatives}
          filters={filters}
          onFilterChange={onFilterChange}
          showItemType={false}
          showSearch
        />
      </div>

      <div className="flex items-stretch gap-3">
        <SprintQueuePanel
          queue={queue}
          initiatives={initiatives}
          isAdmin={isAdmin}
          toast={toast}
        />

        <div className="min-w-0 flex-1">
          <InitiativeTable
            initiatives={enrichedInitiatives}
            onUpdateField={onUpdateField}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRequestPriority={setPriorityInitiative}
            expandedPriorityIds={expandedPriorityIds}
            priorityRequestsByInitiative={requestsMap}
            onTogglePriorityDetails={handleTogglePriorityDetails}
            isAdmin={isAdmin}
            onDeleteRequest={handleDeleteRequest}
          />
        </div>
      </div>
    </DndContext>
  )
}
