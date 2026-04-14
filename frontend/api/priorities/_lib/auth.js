import { supabase } from './supabase.js'

export function is_allowed_domain(email) {
  if (!email || !email.includes('@')) return false
  const domain = email.split('@')[1].toLowerCase()
  return domain === process.env.ALLOWED_EMAIL_DOMAIN.toLowerCase()
}

export async function get_current_user(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return { error: 'Token ausente', status: 401 }

  // Use supabase admin auth to get user
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) return { error: 'Token inválido', status: 401 }

  const email = user.email || ''
  if (!email) return { error: 'Token não contém email.', status: 401 }

  if (!is_allowed_domain(email)) {
    return { error: `Acesso restrito a emails @${process.env.ALLOWED_EMAIL_DOMAIN}.`, status: 403 }
  }

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || ''

  return {
    user: {
      id: user.id,
      email: email,
      role: user.role || 'authenticated',
      full_name: fullName,
    }
  }
}

export async function is_admin_email(email) {
  if (!email) return false
  const { data } = await supabase
    .from('admins')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .limit(1)
  return !!(data && data.length > 0)
}

export async function require_admin(user) {
  if (!user || !(await is_admin_email(user.email))) {
    return { error: 'Acesso restrito a administradores.', status: 403 }
  }
  return null
}
