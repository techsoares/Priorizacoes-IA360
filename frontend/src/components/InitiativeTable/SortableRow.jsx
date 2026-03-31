import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatHours, getDevelopmentEstimateHours } from '../../utils/initiativeInsights'
import EditableCell from './EditableCell'
import StatusBadge from './StatusBadge'
import InitiativeTooltip from '../UI/InitiativeTooltip'

function IntangibleTooltipCell({ value, intangible }) {
  const [pos, setPos] = useState(null)
  const iconRef = useRef(null)

  function handleMouseEnter() {
    if (!iconRef.current) return
    const rect = iconRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
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
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setPos(null)}
        >
          <svg className="h-3 w-3 text-[#3DB7F4]/40 hover:text-[#3DB7F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pos && (
            <div
              className="pointer-events-none fixed z-[9999] w-56 -translate-x-1/2 rounded-lg border border-white/[0.06] bg-surface-elevated p-2.5 text-xs text-gray-300 shadow-xl"
              style={{ top: pos.top, left: pos.left }}
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

export default function SortableRow({ initiative, index, columns, onUpdateField, isSelected, onSelect }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: initiative.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function handleRowClick(event) {
    if (event.target.closest('a, button, input')) return
    if (onSelect) {
      onSelect(isSelected ? null : initiative.id)
    }
  }

  function renderCell(column) {
    if (column.key === 'priority_order') {
      return (
        <span className="flex cursor-grab items-center gap-1.5 text-gray-500 active:cursor-grabbing" {...listeners}>
          <svg className="h-3 w-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
          <span className="font-mono text-[11px] text-gray-600 dark:text-gray-500">{index + 1}</span>
        </span>
      )
    }

    if (column.badge) {
      return <StatusBadge status={initiative[column.key]} />
    }

    if (column.key === 'development_estimate_seconds') {
      return <span className="text-[13px] text-gray-700 dark:text-gray-300">{formatHours(getDevelopmentEstimateHours(initiative))}</span>
    }

    if (column.computed) {
      const metrics = initiative.metrics || {}
      let value = null

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
        const intangible = initiative.intangible_gains
        return (
          <IntangibleTooltipCell value={value} intangible={intangible} />
        )
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
          {initiative[column.key] || '\u2014'}
        </a>
      )
    }

    if (column.key === 'summary') {
      return (
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="block truncate text-[13px] text-gray-900 dark:text-gray-300">{initiative.summary || '\u2014'}</span>
          {showTooltip && <InitiativeTooltip initiative={initiative} />}
        </div>
      )
    }

    return <span className="truncate text-[13px] text-gray-700 dark:text-gray-400">{initiative[column.key] || '\u2014'}</span>
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={handleRowClick}
      className={`border-b border-white/[0.03] transition-colors duration-150 cursor-pointer ${
        isSelected
          ? 'bg-primary/8 ring-1 ring-inset ring-primary/20'
          : 'hover:bg-white/[0.02]'
      } ${isDragging ? 'bg-primary/8 shadow-glow' : ''}`}
    >
      {columns.map((column, colIdx) => (
        <td
          key={column.key}
          className={`px-3 py-2 align-middle ${column.key !== 'summary' ? 'overflow-hidden' : ''} ${
            isSelected && colIdx === 0 ? 'border-l-2 border-[#3559EB]' : ''
          }`}
          style={column.width
            ? { width: `${column.width}px`, minWidth: `${column.minWidth}px`, maxWidth: `${column.width}px` }
            : { minWidth: `${column.minWidth}px` }
          }
        >
          {renderCell(column)}
        </td>
      ))}
    </tr>
  )
}
