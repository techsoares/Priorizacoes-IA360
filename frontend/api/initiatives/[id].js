import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Espelhado de backend/app/priorities/scoring.py
function _clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function _normalize(v, min, max) {
  if (max <= min) return 0
  return ((_clamp(v, min, max) - min) / (max - min)) * 100
}

function _calculateMetrics(initiative) {
  const hours_saved = (initiative.time_saved_per_day || 0) * (initiative.execution_days_per_month || 0)
  const development_estimate_hours = (initiative.development_estimate_seconds || 0) / 3600
  const time_spent_hours = (initiative.time_spent_seconds || 0) / 3600
  const payback_months = development_estimate_hours > 0 && hours_saved > 0
    ? (development_estimate_hours * (initiative.tech_hour_cost || 0)) / Math.max(hours_saved * (initiative.cost_per_hour || 0), 1)
    : null
  const capex_dev = development_estimate_hours * (initiative.tech_hour_cost || 0)
  const capex_devops = (initiative.devops_hours || 0) * (initiative.devops_hour_cost || 0)
  const capex_third = (initiative.third_party_hours || 0) * (initiative.third_party_hour_cost || 0)
  const total_costs = capex_dev + capex_devops + capex_third
  const total_gains = Math.max(
    (hours_saved * (initiative.cost_per_hour || 0)) -
    ((initiative.token_cost || 0) + (initiative.cloud_infra_cost || 0) + (initiative.maintenance_hours || 0) * (initiative.tech_hour_cost || 0)),
    0
  )
  const roi_percent = total_costs > 0 ? ((total_gains * 12) / total_costs) * 100 : 0

  return {
    total_hours_saved: hours_saved,
    total_costs,
    total_gains,
    roi_percent: Math.round(roi_percent * 100) / 100,
    payback_months: payback_months ? Math.round(payback_months * 100) / 100 : null,
    development_estimate_hours,
    time_spent_hours,
  }
}

function _buildPriorityFields(initiative, requestScore = 0, requestsCount = 0) {
  const m = _calculateMetrics(initiative)
  const roiScore = _normalize(m.roi_percent ?? 0, -50, 200)
  const paybackScore = m.payback_months > 0 ? 100 - _normalize(m.payback_months, 1, 18) : 0
  const hoursSavedScore = _normalize(m.total_hours_saved, 4, 240)
  const devScore = m.development_estimate_hours > 0
    ? 100 - _normalize(m.development_estimate_hours, 8, 240) : 0
  const baseScore = _clamp(
    roiScore * 0.40 + paybackScore * 0.25 + hoursSavedScore * 0.20 + devScore * 0.15,
    0, 100
  )
  const reqScore = _clamp(requestScore, -25, 25)
  const finalScore = _clamp(baseScore + reqScore, 0, 100)

  return {
    priority_base_score: Math.round(baseScore * 100) / 100,
    priority_request_score: Math.round(reqScore * 100) / 100,
    priority_final_score: Math.round(finalScore * 100) / 100,
    priority_requests_count: requestsCount,
    priority_score_breakdown: {
      roi_score: Math.round(_clamp(roiScore, 0, 100) * 100) / 100,
      payback_score: Math.round(_clamp(paybackScore, 0, 100) * 100) / 100,
      hours_saved_score: Math.round(_clamp(hoursSavedScore, 0, 100) * 100) / 100,
      development_score: Math.round(_clamp(devScore, 0, 100) * 100) / 100,
      base_score: Math.round(baseScore * 100) / 100,
      request_score: Math.round(reqScore * 100) / 100,
      final_score: Math.round(finalScore * 100) / 100,
    },
    priority_score_updated_at: new Date().toISOString(),
  }
}

async function refreshPriorityScores(initiativeId) {
  const { data: initiative, error: fetchErr } = await supabase
    .from('initiatives')
    .select('*')
    .eq('id', initiativeId)
    .single()

  if (fetchErr || !initiative) {
    throw new Error('Iniciativa não encontrada')
  }

  const { data: activeRequests } = await supabase
    .from('priority_requests')
    .select('ai_delta_score')
    .eq('initiative_id', initiativeId)
    .eq('status', 'active')

  const aggregatedScore = (activeRequests || []).reduce(
    (sum, r) => sum + (parseFloat(r.ai_delta_score) || 0), 0
  )
  const priorityFields = _buildPriorityFields(initiative, aggregatedScore, activeRequests?.length || 0)

  const { data: updated, error: updateErr } = await supabase
    .from('initiatives')
    .update(priorityFields)
    .eq('id', initiativeId)
    .select()
    .single()

  if (updateErr) throw new Error(updateErr.message)
  return updated
}

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id) {
    return res.status(400).json({ error: 'ID da iniciativa é obrigatório' })
  }

  // Valida token
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Token ausente' })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const domain = user.email?.split('@')[1]
  if (domain !== process.env.ALLOWED_EMAIL_DOMAIN) {
    return res.status(403).json({ error: 'Domínio não autorizado' })
  }

  try {
    // Parse do body se for string
    let payload = req.body
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {
        return res.status(400).json({ error: 'JSON inválido no body' })
      }
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Body deve ser um objeto JSON' })
    }

    // Valida payload - campos permitidos para edição
    const allowedFields = [
      'hours_saved', 'cost_per_hour', 'headcount_reduction', 'monthly_employee_cost',
      'productivity_increase', 'additional_task_value', 'tokens_used', 'token_cost',
      'cloud_infra_cost', 'maintenance_hours', 'tech_hour_cost', 'devops_hours',
      'devops_hour_cost', 'third_party_hours', 'third_party_hour_cost',
      'estimated_time_months', 'tools', 'intangible_gains', 'affected_people_count'
    ]

    const updateData = {}
    for (const [key, value] of Object.entries(payload)) {
      if (allowedFields.includes(key) && value != null) {
        updateData[key] = value
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' })
    }

    // Atualiza o registro
    const { data: updated, error: updateErr } = await supabase
      .from('initiatives')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateErr || !updated) {
      return res.status(404).json({ error: 'Iniciativa não encontrada' })
    }

    // Recalcula priority scores
    const withScores = await refreshPriorityScores(id)

    return res.status(200).json(withScores)
  } catch (err) {
    console.error('[initiatives/[id].js]', err)
    return res.status(500).json({ error: err.message || 'Erro ao atualizar iniciativa' })
  }
}
