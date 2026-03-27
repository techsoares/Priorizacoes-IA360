export function toDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isCompleted(initiative) {
  return initiative?.jira_status === 'Concluído'
}

export function getStartDate(initiative) {
  return toDate(initiative?.start_date) || toDate(initiative?.jira_created_at)
}

export function getResolutionDate(initiative) {
  return toDate(initiative?.resolution_date)
}

export function getTimelineEndDate(initiative) {
  return toDate(initiative?.due_date) || getResolutionDate(initiative)
}

export function getLeadTimeDays(initiative) {
  const start = getStartDate(initiative)
  const end = getResolutionDate(initiative)
  if (!start || !end) return null
  const diff = end.getTime() - start.getTime()
  return diff < 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getMonthlyTimeSavedHours(initiative) {
  return (
    Number(initiative?.time_saved_per_day || 0) *
    Number(initiative?.affected_people_count || 0) *
    Number(initiative?.execution_days_per_month || 0)
  )
}

export function getDevelopmentEstimateHours(initiative) {
  return Number(initiative?.development_estimate_seconds || 0) / 3600
}

export function getTimeSpentHours(initiative) {
  return Number(initiative?.time_spent_seconds || 0) / 3600
}

export function formatHours(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} h`
}

export function formatDays(value) {
  if (value == null) return 'N/A'
  return `${Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} dias`
}

export function groupBy(items, getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item)
    if (!accumulator[key]) accumulator[key] = []
    accumulator[key].push(item)
    return accumulator
  }, {})
}
