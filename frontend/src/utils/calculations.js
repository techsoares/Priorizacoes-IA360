/**
 * Formula canonica de metricas no frontend.
 * Alinhada com backend/app/initiatives/calculations.py.
 */
export function calculateMetrics(data) {
  const timeSavedPerDay = Number(data.time_saved_per_day || 0)
  const executionDaysPerMonth = Number(data.execution_days_per_month || 0)
  const affectedPeopleCount = Number(data.affected_people_count || 0)
  const costPerHour = Number(data.cost_per_hour || 0)

  const totalHoursSaved = timeSavedPerDay * executionDaysPerMonth * affectedPeopleCount
  const gainHours = totalHoursSaved * costPerHour

  const gainHeadcount = Number(data.headcount_reduction || 0) * Number(data.monthly_employee_cost || 0)
  const gainProductivity = Number(data.productivity_increase || 0) * Number(data.additional_task_value || 0)
  const totalGainsOpex = gainHours + gainHeadcount + gainProductivity

  const techHourCost = Number(data.tech_hour_cost || 0)
  const maintenanceCost =
    Number(data.maintenance_hours || 0) * techHourCost +
    Number(data.token_cost || 0) +
    Number(data.cloud_infra_cost || 0)
  const netMonthlyGain = totalGainsOpex - maintenanceCost

  const developmentEstimateHours = Number(data.development_estimate_seconds || 0) / 3600
  const timeSpentHours = Number(data.time_spent_seconds || 0) / 3600

  const capexDev = developmentEstimateHours * techHourCost
  const capexDevops = Number(data.devops_hours || 0) * Number(data.devops_hour_cost || 0)
  const capexThirdParty = Number(data.third_party_hours || 0) * Number(data.third_party_hour_cost || 0)
  const initialInvestment = capexDev + capexDevops + capexThirdParty

  const roiPercent = initialInvestment > 0
    ? Math.round((netMonthlyGain / initialInvestment) * 10000) / 100
    : null

  let roiPercentReal = null
  if (timeSpentHours > 0 && developmentEstimateHours > 0) {
    const capexReal = timeSpentHours * techHourCost + capexDevops + capexThirdParty
    if (capexReal > 0) {
      roiPercentReal = Math.round((netMonthlyGain / capexReal) * 10000) / 100
    }
  }

  let roiAccumulated = null
  let monthsLive = null
  const completionDate = data.resolution_date || data.status_updated_at
  if (completionDate) {
    const diffMs = Date.now() - new Date(completionDate).getTime()
    monthsLive = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44))

    const capexForAccumulated = timeSpentHours > 0
      ? timeSpentHours * techHourCost + capexDevops + capexThirdParty
      : initialInvestment

    if (capexForAccumulated > 0) {
      const accumulatedNetGain = netMonthlyGain * monthsLive
      roiAccumulated = Math.round(((accumulatedNetGain - capexForAccumulated) / capexForAccumulated) * 10000) / 100
    }
  }

  let paybackMonths = null
  if (netMonthlyGain > 0) {
    const capexForPayback = timeSpentHours > 0
      ? timeSpentHours * techHourCost + capexDevops + capexThirdParty
      : initialInvestment
    paybackMonths = Math.round((capexForPayback / netMonthlyGain) * 100) / 100
  }

  let timeVariancePercent = null
  if (developmentEstimateHours > 0 && timeSpentHours > 0) {
    timeVariancePercent = Math.round(
      ((timeSpentHours - developmentEstimateHours) / developmentEstimateHours) * 1000
    ) / 10
  }

  return {
    total_gains: Math.round(netMonthlyGain * 100) / 100,
    total_costs: Math.round(initialInvestment * 100) / 100,
    roi_percent: roiPercent,
    roi_percent_real: roiPercentReal,
    roi_accumulated: roiAccumulated,
    months_live: monthsLive != null ? Math.round(monthsLive * 10) / 10 : (completionDate ? 0 : null),
    total_hours_saved: Math.round(totalHoursSaved * 10) / 10,
    payback_months: paybackMonths,
    development_estimate_hours: Math.round(developmentEstimateHours * 100) / 100,
    time_spent_hours: Math.round(timeSpentHours * 100) / 100,
    time_variance_percent: timeVariancePercent,
    capex_development_cost: Math.round(capexDev * 100) / 100,
    capex_devops_cost: Math.round(capexDevops * 100) / 100,
    capex_third_party_cost: Math.round(capexThirdParty * 100) / 100,
  }
}
