import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'

function calculateMetrics(data) {
  const hoursPerPerson = (data.time_saved_per_day || 0) * (data.execution_days_per_month || 0)
  const totalHoursSaved = hoursPerPerson * (data.affected_people_count || 0)
  const gainHours = totalHoursSaved * (data.cost_per_hour || 0)
  const gainHC = (data.headcount_reduction || 0) * (data.monthly_employee_cost || 0)
  const gainProd = (data.productivity_increase || 0) * (data.additional_task_value || 0)
  const totalGains = gainHours + gainHC + gainProd

  const developmentHours = (data.development_estimate_seconds || 0) / 3600
  const initialInvestment = developmentHours * (data.tech_hour_cost || 0) + (data.third_party_hours || 0) * (data.third_party_hour_cost || 0)
  const monthlyMaintenance = (data.maintenance_hours || 0) * (data.tech_hour_cost || 0) + (data.token_cost || 0) + (data.cloud_infra_cost || 0)
  const netMonthlyGain = totalGains - monthlyMaintenance

  // ROI da automação (mensal): lucro líquido vs investimento
  const roiPercent = initialInvestment > 0 ? (netMonthlyGain / initialInvestment) * 100 : null

  // ROI acumulado real: lucro líquido acumulado vs investimento
  let roiAccumulated = null
  let monthsLive = null
  if (data.resolution_date) {
    const diffMs = Date.now() - new Date(data.resolution_date).getTime()
    monthsLive = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44))
    if (initialInvestment > 0) {
      const accumulatedNetGain = netMonthlyGain * monthsLive
      roiAccumulated = ((accumulatedNetGain - initialInvestment) / initialInvestment) * 100
    }
  }

  const paybackMonths = netMonthlyGain > 0 ? initialInvestment / netMonthlyGain : null

  return {
    total_gains: Math.round(netMonthlyGain * 100) / 100,
    total_costs: Math.round(initialInvestment * 100) / 100,
    roi_percent: roiPercent != null ? Math.round(roiPercent * 100) / 100 : null,
    roi_accumulated: roiAccumulated != null ? Math.round(roiAccumulated * 100) / 100 : null,
    months_live: monthsLive != null ? Math.round(monthsLive * 10) / 10 : (data.resolution_date ? 0 : null),
    total_hours_saved: Math.round(totalHoursSaved * 10) / 10,
    payback_months: paybackMonths != null ? Math.round(paybackMonths * 100) / 100 : null,
  }
}

const DEFAULT_FILTERS = {
  activityType: '',
  statusOperator: 'not_equals',
  statuses: ['Concluído', 'Cancelado'],
  assignee: '',
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

  async function reorder(reorderedList) {
    const updated = reorderedList.map((item, index) => ({
      ...item,
      priority_order: index + 1,
    }))
    setInitiatives(updated)

    try {
      await api.patch('/api/initiatives/reorder', {
        ordered_ids: updated.map((item) => item.id),
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

      if (filters.assignee && initiative.assignee !== filters.assignee) {
        return false
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
