import { useState } from 'react'

const ONE_MINUTE_MS = 60 * 1000

function StatusBadge({ status }) {
  const map = {
    active: { label: 'Ativo', cls: 'text-[#40EB4F] bg-[#40EB4F]/8 ring-[#40EB4F]/20' },
    archived: { label: 'Arquivado', cls: 'text-gray-400 bg-white/[0.04] ring-white/10' },
  }
  const cfg = map[status] || { label: status || 'Pendente', cls: 'text-gray-500 bg-white/[0.04] ring-white/10' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ConfidenceBar({ value }) {
  const percent = Math.min(100, Math.round((Number(value) || 0) * 100))
  const color = percent >= 70 ? '#40EB4F' : percent >= 40 ? '#F2F24B' : '#FE70BD'
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums text-gray-500">{percent}%</span>
    </div>
  )
}

function DeltaBadge({ delta }) {
  const value = Number(delta || 0)
  const positive = value >= 0
  return (
    <div className={`flex items-center gap-0.5 rounded-lg px-2 py-1 ring-1 ring-inset ${
      positive
        ? 'bg-[#40EB4F]/8 text-[#40EB4F] ring-[#40EB4F]/20'
        : 'bg-[#FE70BD]/8 text-[#FE70BD] ring-[#FE70BD]/20'
    }`}>
      <svg className={`h-3 w-3 ${positive ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
      <span className="text-[12px] font-semibold tabular-nums">{Math.abs(value).toFixed(1)}</span>
    </div>
  )
}

function DeleteButton({ onDelete }) {
  const [confirming, setConfirming] = useState(false)

  function handleClick(event) {
    event.stopPropagation()
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    onDelete()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={confirming ? 'Confirmar exclusão' : 'Excluir pedido'}
      title={confirming ? 'Clique novamente para confirmar' : 'Excluir pedido'}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all ring-1 ring-inset ${
        confirming
          ? 'bg-[#FE70BD]/10 text-[#FE70BD] ring-[#FE70BD]/30'
          : 'bg-white/[0.03] text-gray-600 ring-white/[0.06] hover:bg-[#FE70BD]/8 hover:text-[#FE70BD] hover:ring-[#FE70BD]/20'
      }`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {confirming ? 'Confirmar?' : ''}
    </button>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function RequestCard({ request, isAdmin, onDelete }) {
  const initials = (request.requester_name || request.requester_email || '?')
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?'

  const wasEdited = request.updated_at && request.created_at &&
    Math.abs(new Date(request.updated_at) - new Date(request.created_at)) > ONE_MINUTE_MS

  const displayDate = wasEdited ? request.updated_at : request.created_at
  const dateFormatted = formatDate(displayDate)

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-[#3DB7F4] ring-1 ring-white/[0.06]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-gray-200">
              {request.requester_name || request.requester_email?.split('@')[0]}
            </p>
            {dateFormatted && (
              <p className="text-[10px] text-gray-600">
                {wasEdited ? 'Editado em ' : ''}{dateFormatted}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={request.status} />
          {request.ai_delta_score != null && <DeltaBadge delta={request.ai_delta_score} />}
          {isAdmin && onDelete && <DeleteButton onDelete={() => onDelete(request.id)} />}
        </div>
      </div>

      <div className="border-t border-white/[0.04] px-4 py-3">
        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-start">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
            Motivo da prioridade
          </div>
          <div className="min-w-0">
            <p className="text-[12px] leading-relaxed text-gray-300">{request.reason}</p>

            {(request.ai_rationale || request.ai_confidence != null) && (
              <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-[#3DB7F4]/[0.04] px-3 py-2">
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3DB7F4]">
                    Avaliação IA
                  </p>
                  {request.ai_rationale && (
                    <p className="truncate text-[11px] text-gray-400">{request.ai_rationale}</p>
                  )}
                </div>
                {request.ai_confidence != null && <ConfidenceBar value={request.ai_confidence} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PriorityRequestsList({ requests = [], isAdmin = false, onDelete, loading = false }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#3DB7F4]" />
        <span className="text-[11px] text-gray-600">Carregando pedidos...</span>
      </div>
    )
  }

  if (!requests.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.015] py-6 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04]">
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-[12px] text-gray-600">Nenhum pedido de prioridade registrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} isAdmin={isAdmin} onDelete={onDelete} />
      ))}
    </div>
  )
}
