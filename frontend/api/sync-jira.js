import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function extractOptionValue(raw) {
  if (!raw) return ''
  if (Array.isArray(raw)) return raw.map(i => i?.value).filter(Boolean).join(', ')
  if (typeof raw === 'object') return raw.value || ''
  return String(raw)
}

function extractFirstOption(raw) {
  if (!raw) return ''
  if (Array.isArray(raw)) return raw.find(i => i?.value)?.value || ''
  return extractOptionValue(raw)
}

function extractNumber(raw) {
  if (raw == null || raw === '') return 0
  // Se for objeto, tenta extrair 'progress' (para aggregateprogress) ou 'value'
  if (typeof raw === 'object') {
    if ('progress' in raw) return parseFloat(raw.progress) || 0
    if ('value' in raw) return parseFloat(raw.value) || 0
    return 0
  }
  return parseFloat(raw) || 0
}

function extractText(raw) {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw.map(extractText).filter(Boolean).join('\n')
  if (typeof raw === 'object') {
    if (raw.text) return raw.text
    if (raw.content) return raw.content.map(extractText).filter(Boolean).join('\n')
  }
  return String(raw)
}

function extractUserDisplayName(raw) {
  if (!raw) return ''
  if (typeof raw === 'object') {
    return raw.displayName || raw.emailAddress || ''
  }
  return String(raw)
}

async function fetchJiraIssues() {
  const jql = process.env.JIRA_JQL || `project = ${process.env.JIRA_PROJECT_KEY} ORDER BY created DESC`
  const credentials = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')

  const res = await fetch(`${process.env.JIRA_BASE_URL}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jql,
      maxResults: 100,
      fields: [
        'summary', 'project', 'status', 'priority', 'assignee', 'issuetype',
        'description', 'created', 'updated', 'resolutiondate', 'duedate',
        'statuscategorychangedate', 'timeoriginalestimate', 'aggregateprogress',
        'customfield_10015', 'customfield_10201', 'customfield_10934',
        'customfield_10935', 'customfield_10936', 'customfield_10937',
        'customfield_10938', 'customfield_10949', 'customfield_10950', 'customfield_10951',
        'customfield_11085',
      ],
    }),
  })

  if (!res.ok) throw new Error(`Jira error: ${res.status}`)
  const data = await res.json()

  return data.issues.map(issue => {
    const f = issue.fields || {}
    const assignee = f.assignee || {}
    return {
      jira_key: issue.key,
      jira_url: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`,
      summary: f.summary || '',
      project_key: f.project?.key || '',
      project_name: f.project?.name || '',
      cost_center: extractFirstOption(f.customfield_10201),
      cost_center_responsible: extractUserDisplayName(f.customfield_11085),
      category: extractOptionValue(f.customfield_10951),
      item_type: f.issuetype?.name || '',
      gain_type: extractOptionValue(f.customfield_10950),
      gain: extractOptionValue(f.customfield_10949),
      activity_type: extractOptionValue(f.customfield_10934),
      tool: extractOptionValue(f.customfield_10935),
      jira_status: f.status?.name || '',
      jira_priority: f.priority?.name || '',
      assignee: assignee.displayName || '',
      assignee_email: assignee.emailAddress || '',
      assignee_avatar_url: assignee.avatarUrls?.['48x48'] || '',
      jira_description: extractText(f.description),
      start_date: f.customfield_10015 || null,
      due_date: f.duedate || null,
      status_updated_at: f.statuscategorychangedate || null,
      resolution_date: f.resolutiondate || null,
      jira_created_at: f.created || null,
      jira_updated_at: f.updated || null,
      time_saved_per_day: extractNumber(f.customfield_10936),
      affected_people_count: extractNumber(f.customfield_10937),
      execution_days_per_month: extractNumber(f.customfield_10938),
      development_estimate_seconds: extractNumber(f.timeoriginalestimate),
      time_spent_seconds: extractNumber(f.aggregateprogress),
    }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Valida token do usuário via Supabase
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Token ausente' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Token inválido' })

  const domain = user.email?.split('@')[1]
  if (domain !== process.env.ALLOWED_EMAIL_DOMAIN) {
    return res.status(403).json({ error: 'Domínio não autorizado' })
  }

  try {
    const jiraIssues = await fetchJiraIssues()

    const { data: existing } = await supabase.from('initiatives').select('id, jira_key')
    const existingKeys = Object.fromEntries((existing || []).map(r => [r.jira_key, r.id]))

    const { data: maxOrderData } = await supabase
      .from('initiatives')
      .select('priority_order')
      .order('priority_order', { ascending: false })
      .limit(1)

    let nextOrder = maxOrderData?.[0]?.priority_order + 1 || 1

    const jiraFields = [
      'jira_url', 'summary', 'project_key', 'project_name', 'cost_center', 'category',
      'cost_center_responsible', 'item_type', 'gain_type', 'gain', 'activity_type', 'tool', 'jira_status',
      'jira_priority', 'assignee', 'assignee_email', 'assignee_avatar_url',
      'jira_description', 'start_date', 'due_date', 'status_updated_at',
      'resolution_date', 'jira_created_at', 'jira_updated_at', 'time_saved_per_day',
      'affected_people_count', 'execution_days_per_month', 'development_estimate_seconds',
      'time_spent_seconds',
    ]

    // Rastreiar keys que estão no Jira agora
    const jiraKeysNow = new Set(jiraIssues.map(issue => issue.jira_key))

    for (const issue of jiraIssues) {
      const syncData = { jira_key: issue.jira_key }
      for (const field of jiraFields) syncData[field] = issue[field]
      syncData.hours_saved = (issue.time_saved_per_day || 0) * (issue.execution_days_per_month || 0)
      syncData.headcount_reduction = issue.affected_people_count || 0
      syncData.tools = issue.tool || ''

      if (existingKeys[issue.jira_key]) {
        await supabase.from('initiatives').update(syncData).eq('jira_key', issue.jira_key)
      } else {
        await supabase.from('initiatives').insert({ ...syncData, priority_order: nextOrder++ })
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // REMOVER issues que não estão mais no Jira (foram movidos de projeto)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const keysToDelete = Object.keys(existingKeys).filter(key => !jiraKeysNow.has(key))
    if (keysToDelete.length > 0) {
      await supabase
        .from('initiatives')
        .delete()
        .in('jira_key', keysToDelete)
    }

    const { data: all } = await supabase
      .from('initiatives')
      .select('*')
      .order('priority_order', { ascending: true })

    return res.status(200).json(all)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
