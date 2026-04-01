import { useState } from 'react'
import { createPortal } from 'react-dom'
import useAdmin from '../../hooks/useAdmin'

const TABS = [
  { id: 'users', label: 'Usuários' },
  { id: 'logs', label: 'Logs de Priorização' },
  { id: 'admins', label: 'Administradores' },
]

export default function AdminPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('users')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [logActivityFilter, setLogActivityFilter] = useState('')
  const { profiles, admins, priorityLogs, loading, addAdmin, removeAdmin, clearPriorityLog } = useAdmin()

  async function handleAddAdmin(e) {
    e.preventDefault()
    if (!newAdminEmail.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      await addAdmin(newAdminEmail)
      setNewAdminEmail('')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveAdmin(email) {
    try {
      await removeAdmin(email)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-white/[0.06] bg-surface-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-[#3DB7F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-white">Administração</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/[0.06] px-6 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-[12px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-[#3DB7F4] text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-[#3DB7F4]" />
            </div>
          ) : (
            <>
              {/* ── Usuários ── */}
              {activeTab === 'users' && (
                <div>
                  <p className="mb-4 text-xs text-gray-500">
                    {profiles.length} usuário{profiles.length !== 1 ? 's' : ''} registrado{profiles.length !== 1 ? 's' : ''}
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-gray-600">
                        <th className="pb-2 pr-4">Nome</th>
                        <th className="pb-2 pr-4">Email</th>
                        <th className="pb-2">Último acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {profiles.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-4 text-[13px] text-gray-300">{p.full_name || '—'}</td>
                          <td className="py-2.5 pr-4 text-[12px] text-gray-400">{p.email}</td>
                          <td className="py-2.5 text-[11px] text-gray-600">
                            {p.last_seen_at
                              ? new Date(p.last_seen_at).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {profiles.length === 0 && (
                    <p className="mt-8 text-center text-sm text-gray-600">Nenhum usuário registrado ainda.</p>
                  )}
                </div>
              )}

              {/* ── Logs de Priorização ── */}
              {activeTab === 'logs' && (
                <div>
                  {(() => {
                    const activityTypes = [...new Set(priorityLogs.map((l) => l.activity_type).filter(Boolean))].sort()
                    const filtered = logActivityFilter
                      ? priorityLogs.filter((l) => l.activity_type === logActivityFilter)
                      : priorityLogs
                    return (
                      <>
                        <div className="mb-4 flex items-center gap-3">
                          <p className="text-xs text-gray-500">
                            {filtered.length} movimentaç{filtered.length !== 1 ? 'ões' : 'ão'}
                          </p>
                          {activityTypes.length > 0 && (
                            <select
                              value={logActivityFilter}
                              onChange={(e) => setLogActivityFilter(e.target.value)}
                              className="rounded-lg border border-white/[0.08] bg-surface px-2.5 py-1 text-[12px] text-gray-300 focus:border-[#3DB7F4]/40 focus:outline-none"
                            >
                              <option value="">Todos os tipos</option>
                              {activityTypes.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-[10px] uppercase tracking-widest text-gray-600">
                              <th className="pb-2 pr-4">Movimentação</th>
                              <th className="pb-2 pr-4">Por</th>
                              <th className="pb-2 pr-4">Data</th>
                              <th className="pb-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {filtered.map((log) => {
                              const from = log.priority_previous_order
                              const to = log.priority_order
                              const movement = from != null
                                ? `Jira ${log.jira_key} movido da posição ${from} para posição ${to}`
                                : `Jira ${log.jira_key} posicionado em #${to}`
                              return (
                                <tr key={log.id}>
                                  <td className="py-2.5 pr-4">
                                    <span className="text-[13px] text-gray-200">{movement}</span>
                                    <span className="ml-2 max-w-[220px] truncate text-[11px] text-gray-600" title={log.summary}>
                                      {log.summary}
                                    </span>
                                  </td>
                                  <td className="py-2.5 pr-4 text-[12px] text-gray-400">{log.priority_updated_by}</td>
                                  <td className="py-2.5 pr-4 text-[11px] text-gray-600">
                                    {log.priority_updated_at
                                      ? new Date(log.priority_updated_at).toLocaleDateString('pt-BR')
                                      : '—'}
                                  </td>
                                  <td className="py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => clearPriorityLog(log.id)}
                                      title="Excluir registro"
                                      className="text-gray-700 transition-colors hover:text-[#FE70BD]"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        {filtered.length === 0 && (
                          <p className="mt-8 text-center text-sm text-gray-600">
                            {logActivityFilter ? 'Nenhuma movimentação para este tipo.' : 'Nenhuma movimentação registrada ainda.'}
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {/* ── Administradores ── */}
              {activeTab === 'admins' && (
                <div>
                  <form onSubmit={handleAddAdmin} className="mb-6 flex items-center gap-2">
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="email@pgmais.com.br"
                      className="flex-1 rounded-lg border border-white/[0.08] bg-surface px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 focus:border-[#3DB7F4]/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={saving || !newAdminEmail.trim()}
                      className="rounded-lg bg-primary/20 px-4 py-2 text-[12px] font-medium text-[#3DB7F4] transition-all hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </form>
                  {saveError && <p className="mb-4 text-xs text-[#FE70BD]">{saveError}</p>}
                  <div className="space-y-2">
                    {admins.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-surface px-4 py-2.5"
                      >
                        <span className="text-[13px] text-gray-300">{a.email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(a.email)}
                          className="text-[11px] text-gray-600 transition-colors hover:text-[#FE70BD]"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    {admins.length === 0 && (
                      <p className="mt-4 text-center text-sm text-gray-600">Nenhum administrador cadastrado.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
