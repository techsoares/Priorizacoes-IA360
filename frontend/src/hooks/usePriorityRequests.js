import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

function buildMaps(rows) {
  const counts = {}
  const requests = {}

  for (const row of rows) {
    const initiativeId = row.initiative_id
    if (!initiativeId) continue

    if (!requests[initiativeId]) requests[initiativeId] = []
    requests[initiativeId].push(row)

    if (row.status === 'active') {
      if (!counts[initiativeId]) counts[initiativeId] = { count: 0, scoreSum: 0 }
      counts[initiativeId].count += 1
      counts[initiativeId].scoreSum += Number(row.ai_delta_score || 0)
    }
  }

  return { counts, requests }
}

export default function usePriorityRequests() {
  const [countMap, setCountMap] = useState({})
  const [requestsMap, setRequestsMap] = useState({})
  const [loading, setLoading] = useState(true)

  const refreshAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('priority_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      setLoading(false)
      return
    }

    const { counts, requests } = buildMaps(data)
    setCountMap(counts)
    setRequestsMap(requests)
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshAll()

    // Atualiza em tempo real quando outro usuário cria, edita ou exclui pedidos
    const channel = supabase
      .channel('priority_requests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'priority_requests' },
        () => { refreshAll() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refreshAll])

  function enrichInitiative(initiative) {
    if (!initiative?.id) return initiative

    const entry = countMap[initiative.id] || { count: 0, scoreSum: 0 }
    const requestScore = Math.round(Math.min(25, Math.max(-25, entry.scoreSum)) * 100) / 100
    const breakdown = initiative.priority_score_breakdown || {}
    const baseScore = Number(breakdown.base_score ?? initiative.priority_base_score ?? 0)
    const finalScore = Math.min(100, Math.max(0, Math.round((baseScore + requestScore) * 10) / 10))

    return {
      ...initiative,
      priority_requests_count: entry.count,
      priority_request_score: requestScore,
      priority_final_score: finalScore,
      priority_score_breakdown: {
        ...breakdown,
        base_score: baseScore,
        request_score: requestScore,
        final_score: finalScore,
      },
    }
  }

  function removeRequestLocally(requestId) {
    setRequestsMap((prev) => {
      const rows = Object.values(prev)
        .flat()
        .filter((row) => row.id !== requestId)
      const { counts, requests } = buildMaps(rows)
      setCountMap(counts)
      return requests
    })
  }

  function upsertRequestLocally(nextRequest) {
    if (!nextRequest?.id || !nextRequest?.initiative_id) return

    setRequestsMap((prev) => {
      const rows = Object.values(prev).flat()
      const withoutCurrent = rows.filter((row) => row.id !== nextRequest.id)
      const withoutSameRequester = withoutCurrent.filter((row) => !(
        row.initiative_id === nextRequest.initiative_id
        && row.requester_email === nextRequest.requester_email
      ))
      const mergedRows = [nextRequest, ...withoutSameRequester]
      const { counts, requests } = buildMaps(mergedRows)
      setCountMap(counts)
      return requests
    })
  }

  return {
    countMap,
    requestsMap,
    loading,
    enrichInitiative,
    refreshAll,
    removeRequestLocally,
    upsertRequestLocally,
  }
}
