const STATUS_STYLES = {
  'To Do': 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
  'A Fazer': 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
  'Backlog': 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
  'In Progress': 'bg-[#3559EB]/10 text-[#3DB7F4] ring-[#3559EB]/20',
  'Em Andamento': 'bg-[#3559EB]/10 text-[#3DB7F4] ring-[#3559EB]/20',
  'Em andamento': 'bg-[#3559EB]/10 text-[#3DB7F4] ring-[#3559EB]/20',
  'Em planejamento': 'bg-[#F2F24B]/12 text-[#D4A520] ring-[#D4A520]/30',
  'Homologação': 'bg-[#40EB4F]/10 text-[#40EB4F] ring-[#40EB4F]/20',
  'Selecionado para Desenvolvimento': 'bg-[#F2F24B]/12 text-[#D4A520] ring-[#D4A520]/30',
  'Pausado': 'bg-red-500/10 text-red-400 ring-red-500/20',
  'Done': 'bg-[#40EB4F]/10 text-[#40EB4F] ring-[#40EB4F]/20',
  'Concluído': 'bg-[#40EB4F]/10 text-[#40EB4F] ring-[#40EB4F]/20',
  'Concluída': 'bg-[#40EB4F]/10 text-[#40EB4F] ring-[#40EB4F]/20',
  'Review': 'bg-[#F2F24B]/10 text-[#F2F24B] ring-[#F2F24B]/20',
  'Em Revisão': 'bg-[#F2F24B]/10 text-[#F2F24B] ring-[#F2F24B]/20',
  'Blocked': 'bg-[#FE70BD]/10 text-[#FE70BD] ring-[#FE70BD]/20',
  'Bloqueado': 'bg-[#FE70BD]/10 text-[#FE70BD] ring-[#FE70BD]/20',
  'Cancelado': 'bg-red-500/10 text-red-400 ring-red-500/20',
}

const DEFAULT_STYLE = 'bg-primary/8 text-[#3DB7F4] ring-primary/15'

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-700">—</span>

  const style = STATUS_STYLES[status] || DEFAULT_STYLE

  return (
    <span className={`inline-flex items-center max-w-full px-2 py-0.5 rounded-md text-[10px] font-medium ring-1 ring-inset truncate ${style}`}>
      {status}
    </span>
  )
}
