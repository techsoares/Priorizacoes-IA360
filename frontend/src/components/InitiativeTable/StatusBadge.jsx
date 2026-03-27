const STATUS_STYLES = {
  'To Do': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  'A Fazer': 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  'In Progress': 'bg-[#3559EB]/15 text-[#3DB7F4] border-[#3559EB]/30',
  'Em Andamento': 'bg-[#3559EB]/15 text-[#3DB7F4] border-[#3559EB]/30',
  'Em andamento': 'bg-[#3559EB]/15 text-[#3DB7F4] border-[#3559EB]/30',
  'Done': 'bg-[#40EB4F]/15 text-[#40EB4F] border-[#40EB4F]/30',
  'Concluído': 'bg-[#40EB4F]/15 text-[#40EB4F] border-[#40EB4F]/30',
  'Concluída': 'bg-[#40EB4F]/15 text-[#40EB4F] border-[#40EB4F]/30',
  'Review': 'bg-[#F2F24B]/15 text-[#F2F24B] border-[#F2F24B]/30',
  'Em Revisão': 'bg-[#F2F24B]/15 text-[#F2F24B] border-[#F2F24B]/30',
  'Blocked': 'bg-[#FE70BD]/15 text-[#FE70BD] border-[#FE70BD]/30',
  'Bloqueado': 'bg-[#FE70BD]/15 text-[#FE70BD] border-[#FE70BD]/30',
}

const DEFAULT_STYLE = 'bg-[#243A83]/40 text-[#3DB7F4] border-[#3559EB]/30'

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-600">—</span>

  const style = STATUS_STYLES[status] || DEFAULT_STYLE

  return (
    <span className={`inline-flex items-center max-w-full px-2 py-0.5 rounded-full text-[10px] font-semibold border truncate ${style}`}>
      {status}
    </span>
  )
}
