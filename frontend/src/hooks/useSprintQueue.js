import { useState, useEffect, useCallback } from 'react'
import {
  listSprintQueue,
  addToSprintQueue,
  moveSprintQueueItem,
  removeFromSprintQueue,
  reorderSprintQueue,
} from '../services/api'
import { supabase } from '../services/supabase'

const MAX_PER_LIST = 5
const ACTIVITY_TYPES = ['Produto', 'Governança']
const QUEUE_GROUPS = ['priorizacoes', 'em_desenvolvimento']

function buildEmptyQueueState() {
  return Object.fromEntries(
    QUEUE_GROUPS.map((group) => [group, Object.fromEntries(ACTIVITY_TYPES.map((type) => [type, []]))])
  )
}

function normalizePositions(list) {
  return list.map((item, index) => ({ ...item, position: index }))
}

export default function useSprintQueue() {
  const [queue, setQueue] = useState(() => buildEmptyQueueState())
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchQueue = useCallback(async () => {
    try {
      const data = await listSprintQueue()
      const grouped = buildEmptyQueueState()

      for (const item of data) {
        const queueGroup = QUEUE_GROUPS.includes(item.queue_group)
          ? item.queue_group
          : 'priorizacoes'

        if (grouped[queueGroup]?.[item.activity_type]) {
          grouped[queueGroup][item.activity_type].push(item)
        }
      }

      setQueue(grouped)
    } catch (err) {
      console.error('Erro ao carregar fila:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  async function addToQueue(initiative, activityType, queueGroup = 'priorizacoes') {
    const type = activityType || initiative.activity_type
    if (!type || !ACTIVITY_TYPES.includes(type) || !QUEUE_GROUPS.includes(queueGroup)) return false

    const currentList = queue[queueGroup]?.[type] || []
    if (currentList.length >= MAX_PER_LIST) {
      showToast('Lista completa para a sprint')
      return false
    }

    const alreadyIn = Object.values(queue).some((group) =>
      Object.values(group).some((list) => list.some((item) => item.initiative_id === initiative.id))
    )
    if (alreadyIn) return false

    const position = currentList.length
    const tempItem = {
      id: `temp-${initiative.id}`,
      initiative_id: initiative.id,
      activity_type: type,
      queue_group: queueGroup,
      position,
    }

    setQueue((prev) => ({
      ...prev,
      [queueGroup]: {
        ...prev[queueGroup],
        [type]: [...(prev[queueGroup]?.[type] || []), tempItem],
      },
    }))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const createdBy = session?.user?.email || null
      await addToSprintQueue(initiative.id, type, position, createdBy, queueGroup)
      await fetchQueue()
    } catch (err) {
      setQueue((prev) => ({
        ...prev,
        [queueGroup]: {
          ...prev[queueGroup],
          [type]: (prev[queueGroup]?.[type] || []).filter((item) => item.initiative_id !== initiative.id),
        },
      }))
      console.error('Erro ao adicionar à fila:', err)
    }

    return true
  }

  async function removeFromQueue(initiativeId) {
    let removedGroup = null
    let removedType = null
    let removedItem = null

    setQueue((prev) => {
      const next = buildEmptyQueueState()

      for (const group of QUEUE_GROUPS) {
        for (const type of ACTIVITY_TYPES) {
          const list = prev[group]?.[type] || []
          const idx = list.findIndex((item) => item.initiative_id === initiativeId)

          if (idx !== -1) {
            removedGroup = group
            removedType = type
            removedItem = list[idx]
            next[group][type] = list.filter((item) => item.initiative_id !== initiativeId)
          } else {
            next[group][type] = list
          }
        }
      }

      return next
    })

    try {
      await removeFromSprintQueue(initiativeId)
    } catch (err) {
      if (removedGroup && removedType && removedItem) {
        setQueue((prev) => ({
          ...prev,
          [removedGroup]: {
            ...prev[removedGroup],
            [removedType]: [...(prev[removedGroup]?.[removedType] || []), removedItem].sort(
              (a, b) => a.position - b.position
            ),
          },
        }))
      }
      console.error('Erro ao remover da fila:', err)
    }
  }

  async function reorderQueue(queueGroup, activityType, newList) {
    if (!QUEUE_GROUPS.includes(queueGroup) || !ACTIVITY_TYPES.includes(activityType)) return

    setQueue((prev) => ({
      ...prev,
      [queueGroup]: {
        ...prev[queueGroup],
        [activityType]: newList,
      },
    }))

    try {
      await reorderSprintQueue(newList.map((item, idx) => ({ id: item.id, position: idx })))
    } catch (err) {
      await fetchQueue()
      console.error('Erro ao reordenar fila:', err)
    }
  }

  async function moveQueueItem(initiativeId, targetQueueGroup, targetActivityType, targetIndex = null) {
    if (!QUEUE_GROUPS.includes(targetQueueGroup) || !ACTIVITY_TYPES.includes(targetActivityType)) {
      return false
    }

    const source = getQueueLocation(initiativeId)
    if (!source) return false

    if (source.queueGroup === targetQueueGroup && source.activityType === targetActivityType) {
      return false
    }

    const targetList = queue[targetQueueGroup]?.[targetActivityType] || []
    if (targetList.length >= MAX_PER_LIST) {
      showToast('Lista completa para a sprint')
      return false
    }

    const safeTargetIndex = Math.max(
      0,
      Math.min(targetIndex == null ? targetList.length : targetIndex, targetList.length)
    )

    setQueue((prev) => {
      const next = buildEmptyQueueState()

      for (const group of QUEUE_GROUPS) {
        for (const type of ACTIVITY_TYPES) {
          next[group][type] = [...(prev[group]?.[type] || [])]
        }
      }

      const sourceList = [...(next[source.queueGroup]?.[source.activityType] || [])]
      const sourceItem = sourceList.find((item) => item.initiative_id === initiativeId)
      if (!sourceItem) return prev

      next[source.queueGroup][source.activityType] = normalizePositions(
        sourceList.filter((item) => item.initiative_id !== initiativeId)
      )

      const destination = [...(next[targetQueueGroup]?.[targetActivityType] || [])]
      destination.splice(safeTargetIndex, 0, {
        ...sourceItem,
        queue_group: targetQueueGroup,
        activity_type: targetActivityType,
      })

      next[targetQueueGroup][targetActivityType] = normalizePositions(destination)
      return next
    })

    try {
      await moveSprintQueueItem(initiativeId, targetQueueGroup, targetActivityType, safeTargetIndex)
      await fetchQueue()
      return true
    } catch (err) {
      await fetchQueue()
      console.error('Erro ao mover item da fila:', err)
      return false
    }
  }

  function isInQueue(initiativeId) {
    return Object.values(queue).some((group) =>
      Object.values(group).some((list) => list.some((item) => item.initiative_id === initiativeId))
    )
  }

  function getQueueLocation(initiativeId) {
    for (const queueGroup of QUEUE_GROUPS) {
      for (const activityType of ACTIVITY_TYPES) {
        if ((queue[queueGroup]?.[activityType] || []).some((item) => item.initiative_id === initiativeId)) {
          return { queueGroup, activityType }
        }
      }
    }

    return null
  }

  return {
    queue,
    loading,
    toast,
    addToQueue,
    moveQueueItem,
    removeFromQueue,
    reorderQueue,
    isInQueue,
    getQueueLocation,
  }
}
