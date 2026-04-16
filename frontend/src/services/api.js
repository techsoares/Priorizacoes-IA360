import { supabase } from './supabase'
import { calculateMetrics } from '../utils/calculations'

const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL
const SYNC_JIRA_ENDPOINTS = ['/api/initiatives/sync-jira', '/api/sync-jira']

function enrich(row) {
  if (!row.jira_url && row.jira_key) {
    row.jira_url = `${JIRA_BASE_URL}/browse/${row.jira_key}`
  }
  return { ...row, metrics: calculateMetrics(row) }
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

function parseSyncResponse(text, endpoint) {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Resposta invalida do servidor em ${endpoint}: ${text.slice(0, 200)}`)
  }
}

export async function listInitiatives() {
  const { data, error } = await supabase
    .from('initiatives')
    .select('*')
    .order('priority_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data.map(enrich)
}

export async function updateInitiative(id, payload) {
  // Chama o backend (não o Supabase diretamente) para que _refresh_priority_scores
  // seja executado e o priority_score seja recalculado após cada atualização de campos.
  const headers = await getAuthHeader()
  const res = await fetch(`/api/initiatives/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    let detail = `HTTP ${res.status}`
    try { detail = JSON.parse(text)?.detail || detail } catch { /* noop */ }
    throw new Error(detail)
  }
  const data = await res.json()
  return enrich(data)
}

export async function reorderInitiatives(orderedIds, updatedBy, dragged) {
  const now = new Date().toISOString()
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    const update = { priority_order: i + 1 }
    if (dragged && id === dragged.id) {
      update.priority_previous_order = dragged.prevOrder ?? null
      update.priority_updated_by = updatedBy || null
      update.priority_updated_at = now
    }
    const { error } = await supabase.from('initiatives').update(update).eq('id', id)
    if (error) throw new Error(error.message)
  }
  return { message: 'Ordem atualizada com sucesso.', count: orderedIds.length }
}

export async function bulkUpdateCosts(items) {
  let updated = 0
  for (const item of items) {
    const { jira_key, ...fields } = item
    const updateData = Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null))
    if (!Object.keys(updateData).length) continue
    const { error } = await supabase.from('initiatives').update(updateData).eq('jira_key', jira_key)
    if (!error) updated++
  }
  return { message: `Custos atualizados para ${updated} iniciativas.`, count: updated }
}

export async function recalculateScores() {
  const headers = await getAuthHeader()
  const res = await fetch('/api/initiatives/recalculate-scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  if (!res.ok) {
    const text = await res.text()
    let detail = `HTTP ${res.status}`
    try { detail = JSON.parse(text)?.detail || detail } catch { /* noop */ }
    throw new Error(detail)
  }
  return res.json()
}

export async function syncJira() {
  const headers = await getAuthHeader()
  let lastError = null

  for (let index = 0; index < SYNC_JIRA_ENDPOINTS.length; index++) {
    const endpoint = SYNC_JIRA_ENDPOINTS[index]
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    })
    const text = await res.text()

    if (res.ok) {
      return parseSyncResponse(text, endpoint).map(enrich)
    }

    if (res.status === 404 && index < SYNC_JIRA_ENDPOINTS.length - 1) {
      continue
    }

    let detail = `HTTP ${res.status}`
    try {
      const parsed = JSON.parse(text)
      detail = parsed?.detail || parsed?.error || detail
    } catch {}
    lastError = new Error(detail)
    break
  }

  throw lastError || new Error('Não foi possível encontrar uma rota de sincronização disponível.')
}

export async function listPriorityRequests() {
  const headers = await getAuthHeader()
  const res = await fetch('/api/priorities/requests', {
    method: 'GET',
    headers,
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      detail = JSON.parse(text)?.detail || detail
    } catch {}
    throw new Error(detail)
  }
  return parseSyncResponse(text, '/api/priorities/requests')
}

export async function createPriorityRequest(payload) {
  const headers = await getAuthHeader()
  const res = await fetch('/api/priorities/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      detail = JSON.parse(text)?.detail || detail
    } catch {}
    throw new Error(detail)
  }
  const parsed = parseSyncResponse(text, '/api/priorities/requests')
  if (parsed?.initiative) {
    parsed.initiative = enrich(parsed.initiative)
  }
  return parsed
}

export async function deletePriorityRequest(requestId) {
  const headers = await getAuthHeader()
  const res = await fetch(`/api/priorities/requests/${requestId}`, {
    method: 'DELETE',
    headers,
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      detail = JSON.parse(text)?.detail || detail
    } catch {}
    throw new Error(detail)
  }
  const parsed = parseSyncResponse(text, `/api/priorities/requests/${requestId}`)
  if (parsed?.initiative) {
    parsed.initiative = enrich(parsed.initiative)
  }
  return parsed
}

export async function reevaluatePriorityRequest(requestId) {
  const headers = await getAuthHeader()
  const res = await fetch(`/api/priorities/requests/${requestId}/re-evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      detail = JSON.parse(text)?.detail || detail
    } catch {}
    throw new Error(detail)
  }
  const parsed = parseSyncResponse(text, `/api/priorities/requests/${requestId}/re-evaluate`)
  if (parsed?.initiative) {
    parsed.initiative = enrich(parsed.initiative)
  }
  return parsed
}

export async function updatePriorityRequestStatus(requestId, status) {
  const headers = await getAuthHeader()
  const res = await fetch(`/api/priorities/requests/${requestId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ status }),
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      detail = JSON.parse(text)?.detail || detail
    } catch {}
    throw new Error(detail)
  }
  const parsed = parseSyncResponse(text, `/api/priorities/requests/${requestId}/status`)
  if (parsed?.initiative) {
    parsed.initiative = enrich(parsed.initiative)
  }
  return parsed
}

// Sprint Queue

export async function listSprintQueue() {
  const { data, error } = await supabase
    .from('sprint_queue')
    .select('*')
    .order('activity_type', { ascending: true })
    .order('position', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function addToSprintQueue(initiativeId, activityType, position, createdBy) {
  const { error } = await supabase.from('sprint_queue').insert({
    initiative_id: initiativeId,
    activity_type: activityType,
    position,
    created_by: createdBy || null,
  })
  if (error) throw new Error(error.message)
}

export async function removeFromSprintQueue(initiativeId) {
  const { error } = await supabase.from('sprint_queue').delete().eq('initiative_id', initiativeId)
  if (error) throw new Error(error.message)
}

export async function reorderSprintQueue(items) {
  for (const item of items) {
    const { error } = await supabase
      .from('sprint_queue')
      .update({ position: item.position })
      .eq('id', item.id)
    if (error) throw new Error(error.message)
  }
}

// Mantem compatibilidade com codigo que usa `api` como default (axios-style)
const api = {
  get: async (url) => {
    if (url.startsWith('/api/initiatives')) {
      return { data: await listInitiatives() }
    }
    throw new Error(`GET ${url} não suportado`)
  },
  post: async (url) => {
    if (url.includes('initiatives/sync-jira') || url.includes('sync-jira')) {
      return { data: await syncJira() }
    }
    throw new Error(`POST ${url} não suportado`)
  },
  put: async (url, payload) => {
    const id = url.split('/').pop()
    return { data: await updateInitiative(id, payload) }
  },
  patch: async (url, payload) => {
    if (url.includes('reorder')) {
      return { data: await reorderInitiatives(payload.ordered_ids, payload.updated_by, payload.dragged) }
    }
    throw new Error(`PATCH ${url} não suportado`)
  },
}

export default api
