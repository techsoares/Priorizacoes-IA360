import { useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './components/Auth/LoginPage'
import AdminView from './components/Views/AdminView'
import DashboardView from './components/Views/DashboardView'
import DeliveriesView from './components/Views/DeliveriesView'
import TimelineView from './components/Views/TimelineView'
import useInitiatives from './hooks/useInitiatives'

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'deliveries', label: 'Entregas' },
  { id: 'admin', label: 'Admin' },
]

function readViewFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return VIEWS.some((view) => view.id === raw) ? raw : 'dashboard'
}

function getUserAvatar(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
}

function getDisplayName(user) {
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  if (fullName.trim()) {
    return fullName.trim().split(/\s+/)[0]
  }

  const email = user?.email || ''
  if (email.includes('@')) {
    return email.split('@')[0]
  }

  return 'Usuário'
}

function getInitials(user) {
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const source = fullName.trim() || user?.email || 'Usuário'

  return source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U'
}

function ViewTabs({ currentView, onViewChange }) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          onClick={() => onViewChange(view.id)}
          className={`rounded-full border px-3 py-1 text-xs transition-all ${
            currentView === view.id
              ? 'border-[#3559EB]/60 bg-[linear-gradient(90deg,rgba(1,32,235,0.20),rgba(254,112,189,0.22))] text-white shadow-[0_0_18px_rgba(53,89,235,0.25)]'
              : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-[#3559EB]/40 hover:text-white'
          }`}
        >
          {view.label}
        </button>
      ))}
    </nav>
  )
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-gray-400 transition-colors hover:border-[#3559EB]/40 hover:text-white"
    >
      {theme === 'dark' ? (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

function UserIdentity({ user, onSignOut }) {
  const [imageFailed, setImageFailed] = useState(false)
  const avatarUrl = getUserAvatar(user)
  const displayName = useMemo(() => getDisplayName(user), [user])
  const initials = useMemo(() => getInitials(user), [user])
  const showImage = avatarUrl && !imageFailed

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2 py-1">
      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-[#3559EB]/15 text-[10px] font-semibold text-[#3DB7F4]">
        {showImage ? (
          <img
            src={avatarUrl}
            alt={displayName}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          initials
        )}
      </div>

      <span className="hidden truncate text-xs text-gray-400 sm:block">{displayName}</span>

      <button
        onClick={onSignOut}
        className="text-xs text-gray-600 transition-colors hover:text-accent-pink"
      >
        Sair
      </button>
    </div>
  )
}

function WorkspacePage() {
  const { user, signOut } = useAuth()
  const {
    initiatives,
    filteredInitiatives,
    loading,
    syncing,
    error,
    filters,
    setFilters,
    syncJira,
    reorder,
    updateField,
  } = useInitiatives()

  const [currentView, setCurrentView] = useState(readViewFromHash)
  const [theme, setTheme] = useState(() => localStorage.getItem('ia360-theme') || 'dark')
  const [lastSyncAt, setLastSyncAt] = useState(null)

  useEffect(() => {
    function handleHashChange() {
      setCurrentView(readViewFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ia360-theme', theme)
  }, [theme])

  function navigateTo(viewId) {
    window.location.hash = `/${viewId}`
  }

  function toggleTheme() {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-surface text-white transition-colors">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-surface-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-2.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="bg-gradient-to-r from-[#3559EB] via-[#3DB7F4] to-[#FE70BD] bg-clip-text text-base font-bold text-transparent">
                IA360°
              </h1>
              <span className="hidden text-xs text-gray-600 sm:block">Dashboard de Priorização</span>
            </div>
            <ViewTabs currentView={currentView} onViewChange={navigateTo} />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  await syncJira()
                  setLastSyncAt(new Date())
                }}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#3559EB]/30 bg-[linear-gradient(90deg,rgba(1,32,235,0.10),rgba(254,112,189,0.12))] px-3 py-1 text-xs font-medium text-[#3DB7F4] transition-colors hover:border-[#3559EB]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {syncing ? 'Sincronizando...' : 'Sincronizar Jira'}
              </button>
              {lastSyncAt && (
                <span className="text-[10px] text-gray-600">
                  {lastSyncAt.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </span>
              )}
            </div>

            <UserIdentity user={user} onSignOut={signOut} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-surface-card/60">
            <div className="h-10 w-10 rounded-full border-2 border-accent-purple/30 border-t-[#6BFFEB] animate-spin" />
            <span className="text-sm text-gray-400">Carregando iniciativas...</span>
          </div>
        ) : null}

        {!loading && currentView === 'dashboard' ? (
          <DashboardView
            initiatives={initiatives}
            filteredInitiatives={filteredInitiatives}
            filters={filters}
            onFilterChange={setFilters}
            onReorder={reorder}
            onUpdateField={updateField}
          />
        ) : null}

        {!loading && currentView === 'timeline' ? (
          <TimelineView
            initiatives={initiatives}
            filteredInitiatives={filteredInitiatives}
            filters={filters}
            onFilterChange={setFilters}
          />
        ) : null}

        {!loading && currentView === 'deliveries' ? (
          <DeliveriesView initiatives={initiatives} />
        ) : null}

        {!loading && currentView === 'admin' ? (
          <AdminView
            initiatives={initiatives}
            filters={filters}
            onFilterChange={setFilters}
            onUpdateField={updateField}
          />
        ) : null}
      </main>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-3">
        <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-[#6BFFEB] rounded-full animate-spin" />
        <span className="text-accent-purple-light text-sm font-medium">
          Carregando...
        </span>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <WorkspacePage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
