import axios from 'axios'
import { supabase } from './supabase'

const LOCAL_API_CANDIDATES = [
  'http://127.0.0.1:8001',
  'http://127.0.0.1:8000',
]

let cachedBaseUrl = null

function isLocalhost() {
  return typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

async function canReachApi(baseUrl) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 1200)

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

async function resolveBaseUrl() {
  if (!isLocalhost()) {
    return import.meta.env.VITE_API_URL
  }

  if (cachedBaseUrl) {
    return cachedBaseUrl
  }

  for (const candidate of LOCAL_API_CANDIDATES) {
    if (await canReachApi(candidate)) {
      cachedBaseUrl = candidate
      return candidate
    }
  }

  cachedBaseUrl = LOCAL_API_CANDIDATES[0]
  return cachedBaseUrl
}

const api = axios.create()

api.interceptors.request.use(async (config) => {
  config.baseURL = await resolveBaseUrl()

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

export default api
