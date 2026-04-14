import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { formatHours, getDevelopmentEstimateHours } from '../../utils/initiativeInsights'
import EditableCell from './EditableCell'
import StatusBadge from './StatusBadge'
import PriorityRequestsList from '../Dashboard/PriorityRequestsList'

function IntangibleTooltipCell({ value, intangible }) {
  const [position, setPosition] = useState(null)
  const iconRef = useRef(null)

  function showTooltip() {
    if (!iconRef.current) return
    const rect = iconRef.current.getBoundingClientRect()
    setPosition({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
  }

  function handleClick(event) {
    event.stopPropagation()
    if (position) {
      setPosition(null)
    } else {
      showTooltip()
    }
  }

  return (
    <span className="flex items-center gap-1">
      <span className="font-medium text-gray-900 dark:text-gray-200">
        {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
      {intangible && (
        <span
          ref={iconRef}
          className="cursor-default"
          onMouseEnter={showTooltip}
          onMouseLeave={() => setPosition(null)}
          onClick={handleClick}
        >
          <svg className="h-3 w-3 text-[#3DB7F4]/40 hover:text-[#3DB7F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {position && (
            <div
              className="pointer-events-none fixed z-[9999] w-56 -translate-x-1/2 rounded-lg border border-white/[0.06] bg-surface-elevated p-2.5 text-xs text-gray-300 shadow-xl"
              style={{ top: position.top, left: position.left }}
            >
              <p className="mb-1 text-[10px] uppercase tracking-widest text-[#3DB7F4]">Ganhos intangíveis</p>
              {intangible}
            </div>
          )}
        </span>
      )}
    </span>
  )
}

function ScoreBreakdownTooltip({ initiative }) {
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const breakdown = initiative.priority_score_breakdown || {}
  const requestsCount = Number(initiative.priority_requests_count || 0)
  const requestScore = Number(initiative.priority_request_score ?? breakdown.request_score ?? 0)

  function showTooltip() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
  }

  function handleClick(event) {
    event.stopPropagation()
    if (position) {
      setPosition(null)
    } else {
      showTooltip()
    }
  }

  const factors = [
    { label: 'ROI', weight: '40%', value: breakdown.roi_score },
    { label: 'Payback', weight: '25%', value: breakdown.payback_score },
    { label: 'Tempo dev', weight: '15%', value: breakdown.development_score },
    { label: 'Horas economizadas', weight: '20%', value: breakdown.hours_saved_score },
  ]

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={showTooltip}
        onMouseLeave={() => setPosition(null)}
        onClick={handleClick}
        aria-label="Ver detalhes do score de prioridade"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-700 transition-colors hover:text-[#3DB7F4]"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {position && (
        <div
          className="pointer-events-none fixed z-[9999] w-[230px] -translate-x-1/2 rounded-xl border border-white/[0.08] bg-gray-950/95 p-3 shadow-2xl backdrop-blur-sm"
          style={{ top: position.top, left: position.left }}
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3DB7F4]">Score de prioridade</p>

          <div className="space-y-2">
            {factors.map((factor) => {
              const value = Math.min(100, Number(factor.value || 0))
              return (
                <div key={factor.label}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      {factor.label} <span className="text-gray-600">({factor.weight})</span>
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-white">
                      {Number(factor.value || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[#3DB7F4]/50" style={{ width: `${value}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Score base</span>
              <span className="text-[11px] font-semibold tabular-nums text-white">
                {Number(breakdown.base_score || 0).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">
                Pedidos <span className="text-gray-600">({requestsCount})</span>
              </span>
              <span className={`text-[11px] font-semibold tabular-nums ${requestScore >= 0 ? 'text-[#40EB4F]' : 'text-[#FE70BD]'}`}>
                {requestScore > 0 ? '+' : ''}{requestScore.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-1.5">
              <span className="text-[10px] font-semibold text-gray-400">Score final</span>
              <span className="text-[14px] font-bold tabular-nums text-[#3DB7F4]">
                {Number(initiative.priority_final_score || breakdown.final_score || 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PriorityScoreCell({ initiative, isExpanded, onToggle, onRequestPriority }) {
  const breakdown = initiative.priority_score_breakdown || {}
  const finalScore = Number(initiative.priority_final_score || breakdown.final_score || 0)
  const requestScore = Number(initiative.priority_request_score || breakdown.request_score || 0)
  const requestsCount = Number(initiative.priority_requests_count || 0)
  const hasRequests = requestsCount > 0
  const hasBoost = hasRequests && Math.abs(requestScore) > 0.01

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onRequestPriority?.(initiative)
        }}
        title="Solicitar prioridade"
        className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-1.5 text-[11px] leading-none text-[#F2F24B] transition-all hover:border-[#F2F24B]/35 hover:bg-[#F2F24B]/10"
      >
        <span aria-hidden="true">⚡</span>
      </button>

      <span className="text-[13px] font-semibold tabular-nums text-[#3DB7F4]">
        {finalScore.toFixed(1)}
      </span>

      {hasBoost && (
        <span
          className={`text-[9px] font-medium tabular-nums leading-none ${
            requestScore >= 0 ? 'text-[#40EB4F]/70' : 'text-[#FE70BD]/70'
          }`}
          title={`Ajuste dos pedidos: ${requestScore >= 0 ? '+' : ''}${requestScore.toFixed(1)}`}
        >
          {requestScore >= 0 ? '+' : ''}{requestScore.toFixed(1)}
        </span>
      )}

      <ScoreBreakdownTooltip initiative={initiative} />

      {(hasRequests || isExpanded) && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggle?.(initiative.id)
          }}
          title={isExpanded ? "Fechar detalhes" : "Ver pedidos de prioridade"}
          className={`inline-flex h-4 w-4 items-center justify-center rounded transition-colors ${
            isExpanded ? 'text-[#F2F24B]' : 'text-gray-600 hover:text-[#F2F24B]'
          }`}
        >
          <svg className={`h-2.5 w-2.5 transition-transform ${isExpanded ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function SortableRow({
  initiative,
  columns,
  onUpdateField,
  isSelected,
  onSelect,
  onRequestPriority,
  isPriorityExpanded,
  priorityRequests,
  onTogglePriorityDetails,
  isAdmin = false,
  onDeleteRequest,
}) {
  // useDraggable: arrastar para o painel de comitê (sem reordenação de tabela)
  const { setNodeRef, listeners, transform, isDragging } = useDraggable({
    id: initiative.id,
    data: { type: 'table' },
    disabled: !isAdmin,
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  function handleRowClick(event) {
    if (event.target.closest('a, button, input, textarea')) return
    onSelect?.(isSelected ? null : initiative.id)
  }

  function renderCell(column) {
    if (column.badge) {
      return <StatusBadge status={initiative[column.key]} />
    }

    if (column.key === 'development_estimate_seconds') {
      return <span className="text-[13px] text-gray-700 dark:text-gray-300">{formatHours(getDevelopmentEstimateHours(initiative))}</span>
    }

    if (column.computed) {
      const metrics = initiative.metrics || {}
      let value = null

      if (column.key === 'priority_final_score') {
        return (
          <PriorityScoreCell
            initiative={initiative}
            isExpanded={isPriorityExpanded}
            onToggle={onTogglePriorityDetails}
            onRequestPriority={onRequestPriority}
          />
        )
      }
      if (column.key === 'hours_saved') value = metrics.total_hours_saved
      if (column.key === 'total_gains') value = metrics.total_gains
      if (column.key === 'total_costs') value = metrics.total_costs
      if (column.key === 'roi_percent') value = metrics.roi_percent
      if (column.key === 'payback_months') value = metrics.payback_months

      if (value == null) return <span className="text-[11px] text-gray-400 dark:text-gray-700">N/A</span>

      if (column.key === 'hours_saved') {
        return <span className="text-[13px] text-gray-700 dark:text-gray-300">{formatHours(value)}</span>
      }

      if (column.key === 'total_gains') {
        return <IntangibleTooltipCell value={value} intangible={initiative.intangible_gains} />
      }

      if (column.key === 'roi_percent') {
        const color = value >= 0 ? 'text-[#40EB4F] dark:text-[#40EB4F]' : 'text-[#FE70BD] dark:text-[#FE70BD]'
        return <span className={`text-[13px] font-semibold ${color}`}>{value.toFixed(1)}%</span>
      }

      if (column.key === 'payback_months') {
        return <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{value.toFixed(1)} m</span>
      }

      return (
        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )
    }

    if (column.editable) {
      return (
        <EditableCell
          value={initiative[column.key]}
          field={column.key}
          onSave={(field, value) => onUpdateField(initiative.id, field, value)}
        />
      )
    }

    if (column.key === 'jira_key') {
      return (
        <a
          href={initiative.jira_url}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono text-[11px] text-[#3DB7F4]/80 transition-colors hover:text-[#3DB7F4] dark:text-[#3DB7F4]/80"
          title={initiative.jira_key}
        >
          {initiative[column.key] || '-'}
        </a>
      )
    }

    if (column.key === 'summary') {
      return (
        <div className="relative flex items-center justify-between gap-2">
          <span className="block min-w-0 truncate text-[13px] text-gray-900 dark:text-gray-300">{initiative.summary || '-'}</span>
        </div>
      )
    }

    return <span className="truncate text-[13px] text-gray-700 dark:text-gray-400">{initiative[column.key] || '-'}</span>
  }

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        {...(isAdmin ? listeners : {})}
        onClick={handleRowClick}
        className={`border-b border-white/[0.03] transition-colors duration-150 ${
          isSelected ? 'bg-primary/8 ring-1 ring-inset ring-primary/20' : 'hover:bg-white/[0.02]'
        } ${isDragging ? 'bg-primary/8 shadow-glow' : ''} ${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      >
        {columns.map((column, columnIndex) => (
          <td
            key={column.key}
            className={`px-3 py-2 align-middle ${column.key !== 'summary' ? 'overflow-hidden' : ''} ${
              isSelected && columnIndex === 0 ? 'border-l-2 border-[#3559EB]' : ''
            }`}
            style={
              column.width
                ? { width: `${column.width}px`, minWidth: `${column.minWidth}px`, maxWidth: `${column.width}px` }
                : { minWidth: `${column.minWidth}px` }
            }
          >
            {renderCell(column)}
          </td>
        ))}
      </tr>
      {isPriorityExpanded && (
        <tr className="border-b border-white/[0.03] bg-white/[0.015]">
          <td colSpan={columns.length} className="px-4 py-3">
            <PriorityRequestsList requests={priorityRequests} isAdmin={isAdmin} onDelete={onDeleteRequest} />
          </td>
        </tr>
      )}
    </>
  )
}
