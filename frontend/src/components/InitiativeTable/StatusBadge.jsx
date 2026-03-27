const STATUS_STYLES = {
  'To Do': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  'A Fazer': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  'In Progress': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Em Andamento': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Em andamento': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Done': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Concluído': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Concluída': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Review': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Em Revisão': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Blocked': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Bloqueado': 'bg-red-500/15 text-red-400 border-red-500/30',
}

const DEFAULT_STYLE = 'bg-accent-purple/15 text-accent-purple-light border-accent-purple/30'

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-600">—</span>

  const style = STATUS_STYLES[status] || DEFAULT_STYLE

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${style}`}>
      {status}
    </span>
  )
}
