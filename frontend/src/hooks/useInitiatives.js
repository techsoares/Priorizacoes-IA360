import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'
import { supabase } from '../services/supabase'

function calculateMetrics(data) {
  const hoursPerPerson = (data.time_saved_per_day || 0) * (data.execution_days_per_month || 0)
  const totalHoursSaved = hoursPerPerson * (data.affected_people_count || 0)
  const gainHours = totalHoursSaved * (data.cost_per_hour || 0)
  const gainHC = (data.headcount_reduction || 0) * (data.monthly_employee_cost || 0)
  const gainProd = (data.productivity_increase || 0) * (data.additional_task_value || 0)
  const totalGains = gainHours + gainHC + gainProd

  const developmentEstimateHours = (data.development_estimate_seconds || 0) / 3600
  const timeSpentHours = (data.time_spent_seconds || 0) / 3600

  const techHourCost = data.tech_hour_cost || 0
  const capexDev = developmentEstimateHours * techHourCost
  const capexThirdParty = (data.third_party_hours || 0) * (data.third_party_hour_cost || 0)
  const initialInvestment = capexDev + capexThirdParty

  const monthlyMaintenance = (data.maintenance_hours || 0) * techHourCost + (data.token_cost || 0) + (data.cloud_infra_cost || 0)
  const netMonthlyGain = totalGains - monthlyMaintenance

  // ROI Estimado: baseado em horas estimadas
  const roiPercent = initialInvestment > 0 ? (netMonthlyGain / initialInvestment) * 100 : null

  // ROI Real: baseado em horas realmente gastas
  let roiPercentReal = null
  if (timeSpentHours > 0 && developmentEstimateHours > 0) {
    const capexReal = (timeSpentHours * techHourCost) + capexThirdParty
    if (capexReal > 0) {
      roiPercentReal = (netMonthlyGain / capexReal) * 100
    }
  }

  // Variância de tempo
  let timeVariancePercent = null
  if (developmentEstimateHours > 0 && timeSpentHours > 0) {
    timeVariancePercent = ((timeSpentHours - developmentEstimateHours) / developmentEstimateHours) * 100
  }

  // ROI acumulado real (usa CAPEX real se disponível)
  let roiAccumulated = null
  let monthsLive = null
  const completionDate = data.resolution_date || data.status_updated_at
  if (completionDate) {
    const diffMs = Date.now() - new Date(completionDate).getTime()
    monthsLive = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44))

    // Determina qual CAPEX usar para o cálculo acumulado
    let capexForAccumulated = initialInvestment
    if (timeSpentHours > 0) {
      // Use CAPEX real (baseado em tempo gasto)
      capexForAccumulated = (timeSpentHours * techHourCost) + capexThirdParty
    }

    if (capexForAccumulated > 0) {
      const accumulatedNetGain = netMonthlyGain * monthsLive
      roiAccumulated = ((accumulatedNetGain - capexForAccumulated) / capexForAccumulated) * 100
    }
  }

  // Payback usa CAPEX real se disponível
  let paybackMonths = null
  if (netMonthlyGain > 0) {
    let capexForPayback = initialInvestment
    if (timeSpentHours > 0) {
      capexForPayback = (timeSpentHours * techHourCost) + capexThirdParty
    }
    paybackMonths = capexForPayback / netMonthlyGain
  }

  return {
    total_gains: Math.round(netMonthlyGain * 100) / 100,
    total_costs: Math.round(initialInvestment * 100) / 100,
    roi_percent: roiPercent != null ? Math.round(roiPercent * 100) / 100 : null,
    roi_percent_real: roiPercentReal != null ? Math.round(roiPercentReal * 100) / 100 : null,
    roi_accumulated: roiAccumulated != null ? Math.round(roiAccumulated * 100) / 100 : null,
    months_live: monthsLive != null ? Math.round(monthsLive * 10) / 10 : (completionDate ? 0 : null),
    total_hours_saved: Math.round(totalHoursSaved * 10) / 10,
    payback_months: paybackMonths != null ? Math.round(paybackMonths * 100) / 100 : null,

    // Novos campos: Tempo de Desenvolvimento
    development_estimate_hours: Math.round(developmentEstimateHours * 100) / 100,
    time_spent_hours: Math.round(timeSpentHours * 100) / 100,
    time_variance_percent: timeVariancePercent != null ? Math.round(timeVariancePercent * 10) / 10 : null,

    // CAPEX Breakdown
    capex_development_cost: Math.round(capexDev * 100) / 100,
    capex_third_party_cost: Math.round(capexThirdParty * 100) / 100,
  }
}

const DEFAULT_FILTERS = {
  activityType: '',
  itemType: 'Tarefa',
  statusOperator: 'not_equals',
  statuses: ['Concluído', 'Cancelado'],
  assignee: '',
  costCenter: '',
  searchTerm: '',
}

export default function useInitiatives() {
  const [initiatives, setInitiatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const errorTimerRef = useCallback((msg) => {
    setError(msg)
    if (msg) setTimeout(() => setError(null), 5000)
  }, [])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const fetchInitiatives = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/initiatives/')
      setInitiatives(data.map(i => ({ ...i, metrics: calculateMetrics(i) })))
      setError(null)
    } catch (err) {
      errorTimerRef(err.message || 'Erro ao carregar iniciativas.')
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
      setInitiatives(data.map(i => ({ ...i, metrics: calculateMetrics(i) })))
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
    const draggedItem = draggedId ? initiatives.find((i) => i.id === draggedId) : null
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
    setInitiatives((prev) =>
      prev.map((item) => {
        if (item.id !== initiativeId) return item
        const updated = { ...item, [field]: value }
        return { ...updated, metrics: calculateMetrics(updated) }
      })
    )

    try {
      await api.put(`/api/initiatives/${initiativeId}`, { [field]: value })
    } catch (err) {
      setInitiatives((prev) =>
        prev.map((item) => {
          if (item.id !== initiativeId) return item
          const reverted = { ...item, [field]: item[field] }
          return { ...reverted, metrics: calculateMetrics(reverted) }
        })
      )
      errorTimerRef(err.message || 'Erro ao salvar alteração.')
    }
  }

  const filteredInitiatives = useMemo(() => {
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

      if (filters.costCenter && initiative.cost_center !== filters.costCenter) {
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
        if (filters.statusOperator === 'equals' && !matchesStatus) {
          return false
        }
        if (filters.statusOperator === 'not_equals' && matchesStatus) {
          return false
        }
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
    refresh: fetchInitiatives,
  }
}
