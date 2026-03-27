import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext({})

const ALLOWED_DOMAIN = 'pgmais.com.br'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        validateAndSetUser(session.user)
      }
      setLoading(false)
    })

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          validateAndSetUser(session.user)
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  function validateAndSetUser(supabaseUser) {
    const email = supabaseUser.email || ''
    const domain = email.split('@')[1]?.toLowerCase()

    if (domain !== ALLOWED_DOMAIN) {
      // Email fora do domínio: faz logout imediato
      supabase.auth.signOut()
      setUser(null)
      return
    }

    setUser(supabaseUser)
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          hd: ALLOWED_DOMAIN, // Sugere domínio no seletor do Google
        },
      },
    })
    if (error) console.error('Erro no login:', error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
