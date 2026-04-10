import { useState, useEffect, useCallback } from 'react'
import {
  listSprintQueue,
  addToSprintQueue,
  removeFromSprintQueue,
  reorderSprintQueue,
} from '../services/api'
import { supabase } from '../services/supabase'

const MAX_PER_LIST = 5
const ACTIVITY_TYPES = ['Produto', 'Governança']

export default function useSprintQueue() {
  const [queue, setQueue] = useState({ Produto: [], Governança: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchQueue = useCallback(async () => {
    try {
      const data = await listSprintQueue()
      const grouped = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t, []]))
      for (const item of data) {
        if (grouped[item.activity_type]) grouped[item.activity_type].push(item)
      }
      setQueue(grouped)
    } catch (err) {
      console.error('Erro ao carregar fila:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  async function addToQueue(initiative, activityType) {
    const type = activityType || initiative.activity_type
    if (!type || !ACTIVITY_TYPES.includes(type)) return false

    const currentList = queue[type] || []
    if (currentList.length >= MAX_PER_LIST) {
      showToast('Lista de priorizações completa para a sprint')
      return false
    }

    // Verifica se já está na fila
    const alreadyIn = Object.values(queue).some((list) =>
      list.some((i) => i.initiative_id === initiative.id)
    )
    if (alreadyIn) return false

    const position = currentList.length
    const tempItem = {
      id: `temp-${initiative.id}`,
      initiative_id: initiative.id,
      activity_type: type,
      position,
    }

    // Optimistic update
    setQueue((prev) => ({ ...prev, [type]: [...(prev[type] || []), tempItem] }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const createdBy = session?.user?.email || null
      await addToSprintQueue(initiative.id, type, position, createdBy)
      await fetchQueue()
    } catch (err) {
      setQueue((prev) => ({
        ...prev,
        [type]: (prev[type] || []).filter((i) => i.initiative_id !== initiative.id),
      }))
      console.error('Erro ao adicionar à fila:', err)
    }
    return true
  }

  async function removeFromQueue(initiativeId) {
    let removedType = null
    let removedItem = null

    setQueue((prev) => {
      const next = { ...prev }
      for (const type of ACTIVITY_TYPES) {
        const idx = next[type].findIndex((i) => i.initiative_id === initiativeId)
        if (idx !== -1) {
          removedType = type
          removedItem = next[type][idx]
          next[type] = next[type].filter((i) => i.initiative_id !== initiativeId)
          break
        }
      }
      return next
    })

    try {
      await removeFromSprintQueue(initiativeId)
    } catch (err) {
      if (removedType && removedItem) {
        setQueue((prev) => ({
          ...prev,
          [removedType]: [...(prev[removedType] || []), removedItem].sort(
            (a, b) => a.position - b.position
          ),
        }))
      }
      console.error('Erro ao remover da fila:', err)
    }
  }

  async function reorderQueue(activityType, newList) {
    setQueue((prev) => ({ ...prev, [activityType]: newList }))
    try {
      await reorderSprintQueue(newList.map((item, idx) => ({ id: item.id, position: idx })))
    } catch (err) {
      await fetchQueue()
      console.error('Erro ao reordenar fila:', err)
    }
  }

  function isInQueue(initiativeId) {
    return Object.values(queue).some((list) => list.some((i) => i.initiative_id === initiativeId))
  }

  function getQueueType(initiativeId) {
    for (const type of ACTIVITY_TYPES) {
      if ((queue[type] || []).some((i) => i.initiative_id === initiativeId)) return type
    }
    return null
  }

  return { queue, loading, toast, addToQueue, removeFromQueue, reorderQueue, isInQueue, getQueueType }
}
