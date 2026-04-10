import { supabase } from './supabase'
import { calculateMetrics } from '../utils/calculations'

const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL

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

export async function listInitiatives() {
  const { data, error } = await supabase
    .from('initiatives')
    .select('*')
    .order('priority_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data.map(enrich)
}

export async function updateInitiative(id, payload) {
  const { error } = await supabase.from('initiatives').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  const { data, error: fetchError } = await supabase
    .from('initiatives')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError) throw new Error(fetchError.message)
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

export async function syncJira() {
  const headers = await getAuthHeader()
  const res = await fetch('/api/sync-jira', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Erro ao sincronizar com Jira')
  }
  const data = await res.json()
  return data.map(enrich)
}

// ── Sprint Queue ──────────────────────────────────────────────────────────────

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

// Mantém compatibilidade com código que usa `api` como default (axios-style)
const api = {
  get: async (url) => {
    if (url.startsWith('/api/initiatives')) {
      return { data: await listInitiatives() }
    }
    throw new Error(`GET ${url} não suportado`)
  },
  post: async (url) => {
    if (url.includes('sync-jira')) {
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
