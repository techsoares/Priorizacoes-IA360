import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select('*')
      .order('priority_order', { ascending: true })

    if (error) throw error

    return res.status(200).json(initiatives || [])
  } catch (err) {
    console.error('[initiatives/index.js]', err)
    return res.status(500).json({ error: err.message || 'Erro ao listar iniciativas' })
  }
}
