function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeFloat(value, defaultValue = 0.0) {
  if (value == null || isNaN(parseFloat(value))) return defaultValue;
  return parseFloat(value);
}

function normalize(value, min, max) {
  if (max <= min) return 0.0;
  const bounded = clamp(value, min, max);
  return ((bounded - min) / (max - min)) * 100;
}

function normalizeInverse(value, min, max) {
  return 100 - normalize(value, min, max);
}

function monthsSince(dt) {
  if (!dt) return 0.0;
  const t = new Date(dt).getTime();
  if (isNaN(t)) return 0.0;
  const delta = Date.now() - t;
  return Math.max(0, delta / (1000 * 60 * 60 * 24 * 30.44));
}

export function calculateMetrics(data) {
    const time_saved_per_day = safeFloat(data.time_saved_per_day);
    const execution_days_per_month = safeFloat(data.execution_days_per_month);
    const affected_people_count = safeFloat(data.affected_people_count);
    const cost_per_hour = safeFloat(data.cost_per_hour);

    const hours_per_person = time_saved_per_day * execution_days_per_month;
    const total_hours_saved = hours_per_person * affected_people_count;
    const gain_hours = total_hours_saved * cost_per_hour;

    const headcount_reduction = safeFloat(data.headcount_reduction);
    const monthly_employee_cost = safeFloat(data.monthly_employee_cost);
    const productivity_increase = safeFloat(data.productivity_increase);
    const additional_task_value = safeFloat(data.additional_task_value);

    const gain_headcount = headcount_reduction * monthly_employee_cost;
    const gain_productivity = productivity_increase * additional_task_value;
    const total_gains_opex = gain_hours + gain_headcount + gain_productivity;

    const maintenance_hours = safeFloat(data.maintenance_hours);
    const tech_hour_cost = safeFloat(data.tech_hour_cost);
    const token_cost = safeFloat(data.token_cost);
    const cloud_infra_cost = safeFloat(data.cloud_infra_cost);
    const maintenance_cost_monthly = (maintenance_hours * tech_hour_cost) + token_cost + cloud_infra_cost;

    const net_gains_monthly = total_gains_opex - maintenance_cost_monthly;

    const development_estimate_seconds = safeFloat(data.development_estimate_seconds);
    const development_estimate_hours = development_estimate_seconds / 3600;
    const capex_dev = development_estimate_hours * tech_hour_cost;

    const third_party_hours = safeFloat(data.third_party_hours);
    const third_party_hour_cost = safeFloat(data.third_party_hour_cost);
    const capex_third_party = third_party_hours * third_party_hour_cost;

    const total_capex = capex_dev + capex_third_party;

    const time_spent_seconds = safeFloat(data.time_spent_seconds);
    const time_spent_hours = time_spent_seconds / 3600;

    let time_variance_percent = null;
    if (development_estimate_hours > 0 && time_spent_hours > 0) {
        time_variance_percent = ((time_spent_hours - development_estimate_hours) / development_estimate_hours) * 100;
    }

    let roi_percent = null;
    if (total_capex > 0) {
        roi_percent = (net_gains_monthly / total_capex) * 100;
    }

    let roi_percent_real = null;
    if (time_spent_hours > 0 && development_estimate_hours > 0) {
        const capex_real = (time_spent_hours * tech_hour_cost) + capex_third_party;
        if (capex_real > 0) {
            roi_percent_real = (net_gains_monthly / capex_real) * 100;
        }
    }

    const resolution_date = data.resolution_date;
    const completion_date = resolution_date || data.status_updated_at;
    const months_live = monthsSince(completion_date);

    let capex_for_accumulated = null;
    if (time_spent_hours > 0) {
        capex_for_accumulated = (time_spent_hours * tech_hour_cost) + capex_third_party;
    } else {
        capex_for_accumulated = total_capex;
    }

    let roi_accumulated = null;
    if (capex_for_accumulated > 0 && months_live > 0) {
        const total_net_gains_so_far = net_gains_monthly * months_live;
        roi_accumulated = ((total_net_gains_so_far - capex_for_accumulated) / capex_for_accumulated) * 100;
    } else if (capex_for_accumulated > 0 && months_live === 0 && completion_date) {
        roi_accumulated = -100.0;
    }

    let payback_months = null;
    if (net_gains_monthly > 0) {
        const capex_for_payback = capex_for_accumulated ? capex_for_accumulated : total_capex;
        payback_months = capex_for_payback / net_gains_monthly;
    }

    return {
        total_gains: net_gains_monthly,
        total_costs: total_capex,
        roi_percent: roi_percent,
        roi_percent_real: roi_percent_real,
        roi_accumulated: roi_accumulated,
        months_live: months_live > 0 ? months_live : (completion_date ? 0.0 : null),
        total_hours_saved: total_hours_saved,
        payback_months: payback_months,
        development_estimate_hours: development_estimate_hours,
        time_spent_hours: time_spent_hours,
        time_variance_percent: time_variance_percent,
        capex_development_cost: capex_dev,
        capex_third_party_cost: capex_third_party,
    };
}

export function calculateBasePriorityBreakdown(initiative) {
    const metrics = calculateMetrics(initiative);

    const roi_percent = safeFloat(metrics.roi_percent, 0.0);
    const payback_months = safeFloat(metrics.payback_months, 18.0);
    const hours_saved = safeFloat(metrics.total_hours_saved, 0.0);
    const development_hours = safeFloat(metrics.development_estimate_hours, 0.0);

    const roi_score = normalize(roi_percent, -50, 200);
    const payback_score = payback_months > 0 ? normalizeInverse(payback_months, 1, 18) : 0.0;
    const hours_saved_score = normalize(hours_saved, 4, 240);
    const development_score = development_hours > 0 ? normalizeInverse(development_hours, 8, 240) : 0.0;

    const base_score =
        roi_score * 0.40
        + payback_score * 0.25
        + hours_saved_score * 0.20
        + development_score * 0.15;

    return {
        roi_score: clamp(roi_score, 0, 100),
        payback_score: clamp(payback_score, 0, 100),
        development_score: clamp(development_score, 0, 100),
        hours_saved_score: clamp(hours_saved_score, 0, 100),
        base_score: clamp(base_score, 0, 100),
    };
}

export function buildPriorityFields(initiative, aggregatedRequestScore, requestsCount) {
    const breakdown = calculateBasePriorityBreakdown(initiative);
    const request_score = clamp(safeFloat(aggregatedRequestScore, 0.0), -25, 25);
    const final_score = clamp(breakdown.base_score + request_score, 0, 100);

    return {
        priority_base_score: breakdown.base_score,
        priority_request_score: request_score,
        priority_final_score: final_score,
        priority_requests_count: requestsCount || 0,
        priority_score_breakdown: {
            ...breakdown,
            request_score: request_score,
            final_score: final_score,
        },
    };
}
