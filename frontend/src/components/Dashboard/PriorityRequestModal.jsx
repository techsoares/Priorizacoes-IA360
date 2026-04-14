import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import { createPriorityRequest } from '../../services/api'

const ONE_MINUTE_MS = 60 * 1000

function ScorePill({ label, value, accent }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] ${accent || 'text-white/80'}`}>
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}

function ExistingRequestPreview({ request }) {
  const wasEdited = request?.updated_at && request?.created_at &&
    Math.abs(new Date(request.updated_at) - new Date(request.created_at)) > ONE_MINUTE_MS

  const displayDate = wasEdited ? request.updated_at : request.created_at
  const date = displayDate
    ? new Date(displayDate).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    : null

  return (
    <div className="space-y-2 rounded-xl border border-[#F2F24B]/20 bg-[#F2F24B]/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F2F24B]">Pedido ativo atual</span>
        {date && (
          <span className="text-[10px] text-gray-500">
            {wasEdited ? 'Editado em ' : ''}{date}
          </span>
        )}
      </div>
      <p className="text-[12px] leading-relaxed text-gray-300">{request.reason}</p>
      {request.ai_rationale && (
        <div className="rounded-lg bg-white/[0.03] px-3 py-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#3DB7F4]">Avaliação IA</p>
          <p className="text-[11px] leading-relaxed text-gray-400">{request.ai_rationale}</p>
        </div>
      )}
    </div>
  )
}

export default function PriorityRequestModal({ initiative, initiativeRequests = [], onClose, onSubmitted }) {
  const { user } = useAuth()
  const userEmail = user?.email?.toLowerCase()
  const existingRequest = initiativeRequests.find(
    (request) => request.requester_email === userEmail && request.status === 'active'
  )

  const [step, setStep] = useState(existingRequest ? 'confirm-replace' : 'form')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!initiative) return null

  async function handleSubmit(event) {
    event.preventDefault()
    if (reason.trim().length < 10) {
      setError('O motivo deve ter pelo menos 10 caracteres.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const result = await createPriorityRequest({
        initiative_id: initiative.id,
        reason,
        replace: Boolean(existingRequest),
      })
      await onSubmitted?.(result)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-surface-card shadow-[0_30px_80px_rgba(0,0,0,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/[0.06] bg-surface-elevated/80 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-[#62c6ff]">{initiative.jira_key}</p>
              <h3 className="mt-1 text-[28px] font-semibold leading-none text-white">
                {step === 'confirm-replace' ? 'Substituir prioridade' : 'Solicitar prioridade'}
              </h3>
              <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed text-gray-300">
                {initiative.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              className="mt-0.5 text-gray-500 transition-colors hover:text-gray-300"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="text-[12px] text-gray-400">
              Pedido feito por{' '}
              <span className="text-gray-200">
                {user?.user_metadata?.full_name || user?.email || 'usuário autenticado'}
              </span>.
            </p>
          </div>

          {step === 'confirm-replace' ? (
            <>
              <div className="rounded-2xl border border-[#FE70BD]/20 bg-[#FE70BD]/[0.05] px-4 py-3">
                <p className="text-[13px] font-medium text-[#FE70BD]">
                  Você já tem uma solicitação ativa para esta iniciativa.
                </p>
                <p className="mt-1 text-[12px] text-gray-400">
                  Ao continuar, seu pedido atual será substituído e reavaliado pela IA.
                </p>
              </div>

              <ExistingRequestPreview request={existingRequest} />

              <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/[0.08] px-3 py-2 text-[12px] text-gray-400 transition-colors hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="rounded-lg bg-[#FE70BD]/10 px-3 py-2 text-[12px] font-medium text-[#FE70BD] transition-all hover:bg-[#FE70BD]/20"
                >
                  Substituir pedido
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ScorePill label="Base" value={Number(initiative.priority_base_score || 0).toFixed(1)} accent="text-[#3DB7F4]" />
                <ScorePill
                  label="Ajuste atual"
                  value={`${Number(initiative.priority_request_score || 0) > 0 ? '+' : ''}${Number(initiative.priority_request_score || 0).toFixed(1)}`}
                  accent="text-[#FE70BD]"
                />
                <ScorePill label="Final" value={Number(initiative.priority_final_score || 0).toFixed(1)} accent="text-[#40EB4F]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">
                    Motivo principal
                  </label>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                    rows={4}
                    placeholder="Explique por que essa iniciativa deveria ganhar prioridade agora."
                    className="w-full rounded-2xl border border-white/[0.08] bg-surface px-4 py-3 text-[15px] leading-relaxed text-gray-200 placeholder:text-gray-600 outline-none transition-all focus:border-[#3DB7F4]/40"
                  />
                  {reason.trim().length > 0 && reason.trim().length < 10 && (
                    <p className="mt-1 text-[11px] text-[#FE70BD]">
                      Mínimo de 10 caracteres ({reason.trim().length}/10)
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-2xl border border-[#FE70BD]/20 bg-[#FE70BD]/5 px-4 py-3 text-[13px] text-[#FE70BD]">
                    {error}
                  </div>
                )}

                <div className="flex items-end justify-between gap-4 border-t border-white/[0.06] pt-4">
                  <p className="max-w-[250px] text-[11px] leading-relaxed text-gray-600">
                    Sua solicitação será avaliada automaticamente pela IA - Claude Opus 4.5 via Open Router PGMais.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-[13px] text-gray-400 transition-colors hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving || reason.trim().length < 10}
                      className="rounded-xl bg-[#2741a5] px-4 py-2.5 text-[13px] font-semibold text-[#6fd2ff] transition-all hover:bg-[#3050c6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving ? 'Enviando...' : existingRequest ? 'Substituir solicitação' : 'Enviar solicitação'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
