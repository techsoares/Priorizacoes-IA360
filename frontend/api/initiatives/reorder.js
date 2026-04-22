import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    const { ordered_ids, updated_by, dragged } = payload

    if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return res.status(400).json({ error: 'ordered_ids deve ser um array não vazio' })
    }

    const now = new Date().toISOString()

    // Atualiza a ordem de cada iniciativa
    for (let i = 0; i < ordered_ids.length; i++) {
      const id = ordered_ids[i]
      const update = { priority_order: i + 1 }

      // Se foi a iniciativa arrastada, registra o movimento
      if (dragged && id === dragged.id) {
        update.priority_previous_order = dragged.prevOrder ?? null
        update.priority_updated_by = updated_by || null
        update.priority_updated_at = now
      }

      const { error } = await supabase
        .from('initiatives')
        .update(update)
        .eq('id', id)

      if (error) throw error
    }

    return res.status(200).json({
      message: 'Ordem atualizada com sucesso.',
      count: ordered_ids.length
    })
  } catch (err) {
    console.error('[initiatives/reorder.js]', err)
    return res.status(500).json({ error: err.message || 'Erro ao reordenar iniciativas' })
  }
}
