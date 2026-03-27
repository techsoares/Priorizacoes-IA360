import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './components/Auth/LoginPage'
import SummaryCards from './components/Dashboard/SummaryCards'
import FilterBar from './components/Dashboard/FilterBar'
import InitiativeTable from './components/InitiativeTable/InitiativeTable'
import useInitiatives from './hooks/useInitiatives'

function DashboardPage() {
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

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-surface-card/80 backdrop-blur-md shadow-sm border-b border-accent-purple/20 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-accent-purple to-primary-light bg-clip-text text-transparent">
              IA360°
            </h1>
            <span className="text-sm text-gray-400 hidden sm:block">
              Dashboard de Priorização
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-accent-pink transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Ações */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Iniciativas
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredInitiatives.length} de {initiatives.length} iniciativas
            </p>
          </div>
          <button
            onClick={syncJira}
            disabled={syncing}
            className="bg-accent-purple hover:bg-accent-purple-dark disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-accent-purple/25 hover:shadow-accent-purple/40"
          >
            <svg
              className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
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
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Cards de resumo — calcula sobre dados filtrados */}
        <SummaryCards initiatives={filteredInitiatives} />

        {/* Filtros */}
        <FilterBar
          initiatives={initiatives}
          filters={filters}
          onFilterChange={setFilters}
        />

        {/* Tabela com Drag & Drop */}
        <InitiativeTable
          initiatives={filteredInitiatives}
          onReorder={reorder}
          onUpdateField={updateField}
        />
      </main>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-3">
        <div className="w-8 h-8 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
        <span className="text-accent-purple-light text-sm font-medium">
          Carregando...
        </span>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <DashboardPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
