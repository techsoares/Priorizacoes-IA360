import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'

// Cálculo client-side para atualização em tempo real
function calculateMetrics(data) {
  const gainHours = (data.hours_saved || 0) * (data.cost_per_hour || 0)
  const gainHC = (data.headcount_reduction || 0) * (data.monthly_employee_cost || 0)
  const gainProd = (data.productivity_increase || 0) * (data.additional_task_value || 0)
  const totalGains = gainHours + gainHC + gainProd

  const costTokens = (data.tokens_used || 0) * (data.token_cost || 0)
  const costInfra = data.cloud_infra_cost || 0
  const costMaint = (data.maintenance_hours || 0) * (data.tech_hour_cost || 0)
  const totalCosts = costTokens + costInfra + costMaint

  const roiPercent = totalCosts > 0 ? ((totalGains - totalCosts) / totalCosts) * 100 : null
  const paybackMonths = totalGains > 0 ? (totalCosts * 12) / totalGains : null

  return {
    total_gains: Math.round(totalGains * 100) / 100,
    total_costs: Math.round(totalCosts * 100) / 100,
    roi_percent: roiPercent != null ? Math.round(roiPercent * 100) / 100 : null,
    payback_months: paybackMonths != null ? Math.round(paybackMonths * 100) / 100 : null,
  }
}

export default function useInitiatives() {
  const [initiatives, setInitiatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ area: '', status: '', assignee: '' })

  const fetchInitiatives = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/initiatives/')
      setInitiatives(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar iniciativas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitiatives()
  }, [fetchInitiatives])

  async function syncJira() {
    try {
      setSyncing(true)
      const { data } = await api.post('/api/initiatives/sync-jira')
      setInitiatives(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao sincronizar com Jira.')
    } finally {
      setSyncing(false)
    }
  }

  async function reorder(reorderedList) {
    // Atualiza otimisticamente no frontend
    const updated = reorderedList.map((item, i) => ({
      ...item,
      priority_order: i + 1,
    }))
    setInitiatives(updated)

    try {
      await api.patch('/api/initiatives/reorder', {
        ordered_ids: updated.map((i) => i.id),
      })
    } catch (err) {
      setError('Erro ao salvar nova ordem.')
      fetchInitiatives() // Rollback
    }
  }

  async function updateField(initiativeId, field, value) {
    // Atualiza otimisticamente com recálculo client-side
    setInitiatives((prev) =>
      prev.map((item) => {
        if (item.id !== initiativeId) return item
        const updated = { ...item, [field]: value }
        return { ...updated, metrics: calculateMetrics(updated) }
      })
    )

    // Debounce no componente, aqui só persiste
    try {
      await api.put(`/api/initiatives/${initiativeId}`, { [field]: value })
    } catch (err) {
      setError('Erro ao salvar alteração.')
      fetchInitiatives() // Rollback
    }
  }

  const filteredInitiatives = useMemo(() => {
    return initiatives.filter((i) => {
      if (filters.area && i.cost_center !== filters.area) return false
      if (filters.status && i.jira_status !== filters.status) return false
      if (filters.assignee && i.assignee !== filters.assignee) return false
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
    syncJira,
    reorder,
    updateField,
    refresh: fetchInitiatives,
  }
}
