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
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
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
    <div className={`mb-4 rounded-lg border px-4 py-2 text-[12px] ${isError
        ? 'border-[#FE70BD]/20 bg-[#FE70BD]/10 text-[#FE70BD]'
        : 'border-[#40EB4F]/20 bg-[#40EB4F]/10 text-[#40EB4F]'
      }`}>
      {feedback.message}
    </div>
  )
}

function resolveDropTarget(over) {
  if (!over) return null

  const overData = over.data.current
  if (overData?.type === 'panel-list') {
    return {
      queueGroup: overData.queueGroup,
      activityType: overData.activityType,
      overType: 'panel-list',
      overInitiativeId: null,
    }
  }

  if (overData?.type === 'panel-item') {
    return {
      queueGroup: overData.queueGroup,
      activityType: overData.activityType,
      overType: 'panel-item',
      overInitiativeId: overData.initiativeId,
    }
  }

  const overId = String(over.id || '')
  const [, queueGroup, ...rest] = overId.split('-')
  if (!queueGroup || rest.length === 0) return null

  return {
    queueGroup,
    activityType: rest.join('-'),
    overType: 'panel-list',
    overInitiativeId: null,
  }
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

  const {
    queue,
    toast,
    addToQueue,
    moveQueueItem,
    removeFromQueue,
    reorderQueue,
    getQueueLocation,
  } = useSprintQueue()

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
    const dropTarget = resolveDropTarget(over)

    if (activeData?.type === 'panel-item') {
      if (!isAdmin) return
      const { initiativeId } = activeData

      if (!dropTarget) {
        removeFromQueue(initiativeId)
        return
      }

      const source = getQueueLocation(initiativeId)
      if (!source) return

      const sourceList = queue[source.queueGroup]?.[source.activityType] || []

      if (
        dropTarget.queueGroup === source.queueGroup &&
        dropTarget.activityType === source.activityType &&
        dropTarget.overType === 'panel-item' &&
        dropTarget.overInitiativeId
      ) {
        const oldIndex = sourceList.findIndex((item) => item.initiative_id === initiativeId)
        const newIndex = sourceList.findIndex((item) => item.initiative_id === dropTarget.overInitiativeId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderQueue(source.queueGroup, source.activityType, arrayMove(sourceList, oldIndex, newIndex))
        }
        return
      }

      const targetList = queue[dropTarget.queueGroup]?.[dropTarget.activityType] || []
      const targetIndex = dropTarget.overType === 'panel-item' && dropTarget.overInitiativeId
        ? targetList.findIndex((item) => item.initiative_id === dropTarget.overInitiativeId)
        : targetList.length

      moveQueueItem(
        initiativeId,
        dropTarget.queueGroup,
        dropTarget.activityType,
        targetIndex === -1 ? targetList.length : targetIndex
      )
      return
    }

    if (!dropTarget || !isAdmin) return

    const initiative = filteredInitiatives.find((item) => item.id === active.id)
    if (!initiative) return

    addToQueue(initiative, dropTarget.activityType, dropTarget.queueGroup)
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

        <SprintQueuePanel
          title="em desenvolvimento"
          queueGroup="em_desenvolvimento"
          queue={queue.em_desenvolvimento}
          initiatives={initiatives}
          isAdmin={isAdmin}
          toast={toast}
        />

        <SprintQueuePanel
          title="Selecionado para desenvolvimento"
          queueGroup="priorizacoes"
          queue={queue.priorizacoes}
          initiatives={initiatives}
          isAdmin={isAdmin}
          toast={toast}
        />
      </div>
    </DndContext>
  )
}
