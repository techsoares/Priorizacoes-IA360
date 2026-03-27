import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3559EB] via-[#3DB7F4] to-[#FE70BD] bg-clip-text text-transparent tracking-tight">
            IA360°
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gray-500">
            Dashboard de Priorização
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
          <p className="mb-6 text-center text-xs text-gray-500">
            Acesso restrito a <span className="text-gray-300">@pgmais.com.br</span>
          </p>

          <button
            onClick={signInWithGoogle}
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-[#3559EB]/30 bg-[#3559EB]/10 px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-[#3559EB]/60 hover:bg-[#3559EB]/20"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar com Google
          </button>
        </div>

        <p className="mt-6 text-center text-[10px] text-gray-600">
          PGMais © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
