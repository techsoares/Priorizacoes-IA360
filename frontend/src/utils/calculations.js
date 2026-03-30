function toFloat(value) {
  return parseFloat(value || 0) || 0
}

export function calculateMetrics(data) {
  const timeSavedPerDay = toFloat(data.time_saved_per_day)
  const executionDaysPerMonth = toFloat(data.execution_days_per_month)
  const affectedPeopleCount = toFloat(data.affected_people_count)
  const costPerHour = toFloat(data.cost_per_hour)

  const hoursPerPerson = timeSavedPerDay * executionDaysPerMonth
  const totalHoursSaved = hoursPerPerson * affectedPeopleCount
  const gainHours = totalHoursSaved * costPerHour

  const headcountReduction = toFloat(data.headcount_reduction)
  const monthlyEmployeeCost = toFloat(data.monthly_employee_cost)
  const productivityIncrease = toFloat(data.productivity_increase)
  const additionalTaskValue = toFloat(data.additional_task_value)

  const gainHeadcount = headcountReduction * monthlyEmployeeCost
  const gainProductivity = productivityIncrease * additionalTaskValue
  const totalGains = gainHours + gainHeadcount + gainProductivity

  const devHours = toFloat(data.development_estimate_seconds) / 3600
  const techHourCost = toFloat(data.tech_hour_cost)
  const thirdPartyHours = toFloat(data.third_party_hours)
  const thirdPartyHourCost = toFloat(data.third_party_hour_cost)
  const tokenCost = toFloat(data.token_cost)
  const cloudInfraCost = toFloat(data.cloud_infra_cost)

  const totalCosts = devHours * techHourCost + thirdPartyHours * thirdPartyHourCost + tokenCost + cloudInfraCost

  const roiPercent = totalCosts > 0 ? Math.round(((totalGains - totalCosts) / totalCosts) * 10000) / 100 : null
  const paybackMonths = totalGains > 0 ? Math.round((totalCosts / totalGains) * 100) / 100 : null

  return {
    total_gains: Math.round(totalGains * 100) / 100,
    total_costs: Math.round(totalCosts * 100) / 100,
    roi_percent: roiPercent,
    payback_months: paybackMonths,
  }
}
