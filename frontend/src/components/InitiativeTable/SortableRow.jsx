import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import EditableCell from './EditableCell'
import StatusBadge from './StatusBadge'

export default function SortableRow({ initiative, index, columns, onUpdateField }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: initiative.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function renderCell(col) {
    // Prioridade (com handle de drag)
    if (col.key === 'priority_order') {
      return (
        <span className="cursor-grab active:cursor-grabbing flex items-center gap-1.5 text-gray-400" {...listeners}>
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
          <span className="text-xs font-mono">{index + 1}</span>
        </span>
      )
    }

    // Status com badge colorido
    if (col.badge) {
      return <StatusBadge status={initiative[col.key]} />
    }

    // Responsável com avatar
    if (col.key === 'assignee') {
      const name = initiative.assignee
      if (!name) return <span className="text-gray-600">—</span>
      const initials = name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
      return (
        <span className="flex items-center gap-1.5 truncate" title={name}>
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 text-accent-purple-light text-[10px] font-bold flex items-center justify-center">
            {initials}
          </span>
          <span className="truncate text-gray-300 text-xs">{name.split(' ')[0]}</span>
        </span>
      )
    }

    // Campos calculados (métricas)
    if (col.computed) {
      const metrics = initiative.metrics || {}
      let value = null

      if (col.key === 'total_gains') value = metrics.total_gains
      if (col.key === 'total_costs') value = metrics.total_costs
      if (col.key === 'roi_percent') value = metrics.roi_percent
      if (col.key === 'payback_months') value = metrics.payback_months

      if (value == null) return <span className="text-gray-600 text-xs">N/A</span>

      if (col.key === 'roi_percent') {
        const color = value >= 0 ? 'text-accent-purple-light font-semibold' : 'text-accent-pink font-semibold'
        return <span className={color}>{value.toFixed(1)}%</span>
      }
      if (col.key === 'payback_months') {
        return <span className="font-medium text-gray-200">{value.toFixed(1)} m</span>
      }
      return (
        <span className="font-medium text-gray-200">
          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )
    }

    // Campos editáveis
    if (col.editable) {
      return (
        <EditableCell
          value={initiative[col.key]}
          field={col.key}
          onSave={(field, val) => onUpdateField(initiative.id, field, val)}
        />
      )
    }

    // Campos somente leitura (Jira)
    if (col.key === 'jira_key') {
      return (
        <span className="truncate text-accent-purple-light/80 font-mono text-xs">
          {initiative[col.key] || '—'}
        </span>
      )
    }

    return <span className="truncate text-gray-300">{initiative[col.key] || '—'}</span>
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`border-b border-white/5 hover:bg-accent-purple/5 transition-colors ${
        isDragging ? 'bg-accent-purple/10 shadow-lg shadow-accent-purple/10' : ''
      }`}
    >
      {columns.map((col) => (
        <td key={col.key} className={`${col.width} px-3 py-2.5`}>
          {renderCell(col)}
        </td>
      ))}
    </tr>
  )
}
