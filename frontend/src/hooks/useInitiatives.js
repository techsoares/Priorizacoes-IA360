import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { supabase } from '../services/supabase'
import { calculateMetrics } from '../utils/calculations'

const DEFAULT_FILTERS = {
  activityType: '',
  itemType: 'Tarefa',
  statusOperator: 'not_equals',
  statuses: ['Concluído', 'Cancelado'],
  assignee: '',
  costCenterResponsible: '',
  costCenter: '',
  costCenters: [],
  searchTerm: '',
  hasPriorityRequests: false,
}

function getSelectedCostCenters(filters) {
  if (Array.isArray(filters.costCenters)) {
    return filters.costCenters.filter(Boolean)
  }
  return filters.costCenter ? [filters.costCenter] : []
}

function withMetrics(initiative) {
  return { ...initiative, metrics: calculateMetrics(initiative) }
}

export default function useInitiatives() {
  const [initiatives, setInitiatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const errorTimerRef = useCallback((message) => {
    setError(message)
    if (message) setTimeout(() => setError(null), 5000)
  }, [])

  const fetchInitiatives = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/initiatives/')
      setInitiatives(data.map(withMetrics))
      setError(null)
    } catch (err) {
      errorTimerRef(err.message || 'Erro ao carregar iniciativas.')
    } finally {
      setLoading(false)
    }
  }, [errorTimerRef])

  useEffect(() => {
    fetchInitiatives()
  }, [fetchInitiatives])

  async function syncJira() {
    try {
      setSyncing(true)
      const { data } = await api.post('/api/initiatives/sync-jira')
      setInitiatives(data.map(withMetrics))
      setError(null)
    } catch (err) {
      errorTimerRef(err.message || 'Erro ao sincronizar com Jira.')
    } finally {
      setSyncing(false)
    }
  }

  async function reorder(reorderedList, draggedId) {
    const { data: { session } } = await supabase.auth.getSession()
    const updatedBy = session?.user?.user_metadata?.full_name || session?.user?.email || null

    const now = new Date().toISOString()
    const draggedItem = draggedId ? initiatives.find((item) => item.id === draggedId) : null
    const prevOrder = draggedItem?.priority_order ?? null

    const updated = reorderedList.map((item, index) => {
      const isDragged = item.id === draggedId
      return {
        ...item,
        priority_order: index + 1,
        priority_previous_order: isDragged ? prevOrder : item.priority_previous_order,
        priority_updated_by: isDragged ? updatedBy : item.priority_updated_by,
        priority_updated_at: isDragged ? now : item.priority_updated_at,
      }
    })
    setInitiatives(updated)

    try {
      await api.patch('/api/initiatives/reorder', {
        ordered_ids: updated.map((item) => item.id),
        updated_by: updatedBy,
        dragged: draggedId ? { id: draggedId, prevOrder } : null,
      })
    } catch (err) {
      errorTimerRef('Erro ao salvar nova ordem.')
      fetchInitiatives()
    }
  }

  async function updateField(initiativeId, field, value) {
    const previousInitiative = initiatives.find((item) => item.id === initiativeId)

    setInitiatives((prev) =>
      prev.map((item) => {
        if (item.id !== initiativeId) return item
        return withMetrics({ ...item, [field]: value })
      })
    )

    try {
      const { data } = await api.put(`/api/initiatives/${initiativeId}`, { [field]: value })
      setInitiatives((prev) =>
        prev.map((item) => (item.id === initiativeId ? withMetrics(data) : item))
      )
    } catch (err) {
      if (previousInitiative) {
        setInitiatives((prev) =>
          prev.map((item) => (item.id === initiativeId ? previousInitiative : item))
        )
      }
      errorTimerRef(err.message || 'Erro ao salvar alteração.')
    }
  }

  const replaceInitiative = useCallback((nextInitiative) => {
    if (!nextInitiative?.id) return
    setInitiatives((prev) =>
      prev.map((item) => (item.id === nextInitiative.id ? withMetrics(nextInitiative) : item))
    )
  }, [])

  const filteredInitiatives = useMemo(() => {
    const selectedCostCenters = getSelectedCostCenters(filters)

    return initiatives.filter((initiative) => {
      if (filters.activityType && initiative.activity_type !== filters.activityType) {
        return false
      }

      if (filters.itemType && initiative.item_type !== filters.itemType) {
        return false
      }

      if (filters.assignee && initiative.assignee !== filters.assignee) {
        return false
      }

      if (filters.costCenterResponsible && initiative.cost_center_responsible !== filters.costCenterResponsible) {
        return false
      }

      if (selectedCostCenters.length > 0 && !selectedCostCenters.includes(initiative.cost_center)) {
        return false
      }

      if (filters.hasPriorityRequests && Number(initiative.priority_requests_count || 0) <= 0) {
        return false
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        const matchesSearch =
          initiative.summary?.toLowerCase().includes(term) ||
          initiative.jira_key?.toLowerCase().includes(term)
        if (!matchesSearch) return false
      }

      if (filters.statuses.length > 0) {
        const matchesStatus = filters.statuses.includes(initiative.jira_status)
        if (filters.statusOperator === 'equals' && !matchesStatus) return false
        if (filters.statusOperator === 'not_equals' && matchesStatus) return false
      }

      return true
    })
  }, [initiatives, filters])

  return {
    initiatives,
    filteredInitiatives,
    loading,
    syncing,
    error,
    filters,
    setFilters,
    defaultFilters: DEFAULT_FILTERS,
    syncJira,
    reorder,
    updateField,
    replaceInitiative,
    refresh: fetchInitiatives,
  }
}
