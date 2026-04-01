import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'

export default function useAdmin() {
  const [profiles, setProfiles] = useState([])
  const [admins, setAdmins] = useState([])
  const [priorityLogs, setPriorityLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [profilesRes, adminsRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('last_seen_at', { ascending: false }),
      supabase.from('admins').select('*').order('created_at'),
      supabase
        .from('initiatives')
        .select('id, jira_key, summary, activity_type, priority_order, priority_previous_order, priority_updated_by, priority_updated_at')
        .not('priority_updated_by', 'is', null)
        .order('priority_updated_at', { ascending: false }),
    ])
    setProfiles(profilesRes.data || [])
    setAdmins(adminsRes.data || [])
    setPriorityLogs(logsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function addAdmin(email) {
    const { error } = await supabase.from('admins').insert({ email: email.toLowerCase().trim() })
    if (error) throw new Error(error.message)
    await loadData()
  }

  async function removeAdmin(email) {
    const { error } = await supabase.from('admins').delete().eq('email', email)
    if (error) throw new Error(error.message)
    await loadData()
  }

  async function clearPriorityLog(initiativeId) {
    const { error } = await supabase
      .from('initiatives')
      .update({ priority_updated_by: null, priority_updated_at: null })
      .eq('id', initiativeId)
    if (error) throw new Error(error.message)
    setPriorityLogs((prev) => prev.filter((l) => l.id !== initiativeId))
  }

  return { profiles, admins, priorityLogs, loading, addAdmin, removeAdmin, clearPriorityLog }
}
