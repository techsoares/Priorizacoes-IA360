import { useEffect, useMemo, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './components/Auth/LoginPage'
import AdminView from './components/Views/AdminView'
import DashboardView from './components/Views/DashboardView'
import DeliveriesView from './components/Views/DeliveriesView'
import TimelineView from './components/Views/TimelineView'
import useInitiatives from './hooks/useInitiatives'
import AdminPanel from './components/Admin/AdminPanel'

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'timeline', label: 'Timeline', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'deliveries', label: 'Entregas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'admin', label: 'Custos & Dados', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
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
    <nav className="flex items-center gap-1">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          onClick={() => onViewChange(view.id)}
          className={`group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
            currentView === view.id
              ? 'bg-primary/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
          }`}
        >
          <svg className={`h-3.5 w-3.5 transition-colors ${currentView === view.id ? 'text-[#3DB7F4]' : 'text-gray-600 group-hover:text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={view.icon} />
          </svg>
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/[0.04] hover:text-gray-300"
    >
      {theme === 'dark' ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-semibold text-[#3DB7F4] ring-1 ring-white/[0.06]">
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

      <span className="hidden text-[13px] text-gray-400 sm:block">{displayName}</span>

      <button
        onClick={onSignOut}
        className="text-[11px] text-gray-600 transition-colors hover:text-accent-pink"
      >
        Sair
      </button>
    </div>
  )
}

function WorkspacePage() {
  const { user, isAdmin, signOut } = useAuth()
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
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)

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
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.04] bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-2">
          {/* Left: Brand + Nav */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[15px] font-bold tracking-tight">
                <span className="bg-gradient-to-r from-[#3559EB] via-[#3DB7F4] to-[#FE70BD] bg-clip-text text-transparent">
                  IA360°
                </span>
              </h1>
              <div className="hidden h-4 w-px bg-white/[0.06] sm:block" />
              <span className="hidden text-[11px] tracking-wide text-gray-600 sm:block">Priorização</span>
            </div>
            <ViewTabs currentView={currentView} onViewChange={navigateTo} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <div className="mx-1 h-4 w-px bg-white/[0.06]" />

            <button
              onClick={async () => {
                await syncJira()
                setLastSyncAt(new Date())
              }}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-gray-400 transition-all hover:bg-white/[0.04] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {syncing ? 'Sincronizando...' : 'Sync Jira'}
            </button>
            {lastSyncAt && (
              <span className="text-[10px] text-gray-600">
                {lastSyncAt.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              </span>
            )}

            <div className="mx-1 h-4 w-px bg-white/[0.06]" />

            {isAdmin && (
              <button
                type="button"
                onClick={() => setAdminPanelOpen(true)}
                title="Administração"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-all hover:bg-white/[0.04] hover:text-gray-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}

            <UserIdentity user={user} onSignOut={signOut} />
          </div>
        </div>
      </header>

      {adminPanelOpen && <AdminPanel onClose={() => setAdminPanelOpen(false)} />}

      {/* ── Content ── */}
      <main className="mx-auto max-w-[1600px] px-5 py-6">
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-[#3DB7F4] animate-spin" />
            <span className="text-sm text-gray-500">Carregando iniciativas...</span>
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
            isAdmin={isAdmin}
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
        <div className="w-8 h-8 border-2 border-primary/20 border-t-[#3DB7F4] rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-medium">
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
