import Tooltip from './Tooltip'

function fmt(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtCompact(value) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return fmt(value)
}

export default function CapexOpexBadge({ capex, opex, type = 'split', payback = null }) {
  if (type === 'split') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: '#FE70BD' }}
            />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">CAPEX</span>
              <span className="text-[12px] font-black text-white">{fmtCompact(capex)}</span>
            </div>
          </div>
          <Tooltip content="CAPEX: Custo one-time de desenvolvimento (R$/h dev × horas estimadas). Não é salário — é custo técnico." />
        </div>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: '#6BFFEB' }}
            />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">OPEX/mês</span>
              <span className="text-[12px] font-black text-white">{fmtCompact(opex)}</span>
            </div>
          </div>
          <Tooltip content="OPEX: Economia MENSAL operacional (horas economizadas × custo_hora_pessoa + ganhos). Cresce a cada mês." />
        </div>

        {payback !== null && (
          <>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Payback:</span>
              <span className="text-[12px] font-black text-[#3DB7F4]">{payback.toFixed(1)}m</span>
            </div>
          </>
        )}
      </div>
    )
  }

  if (type === 'capex-only') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: '#FE70BD' }}
        />
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">CAPEX Investimento</span>
          <span className="text-[12px] font-black text-white">{fmtCompact(capex)}</span>
        </div>
        <Tooltip content="CAPEX: Investimento técnico one-time em desenvolvimento." />
      </div>
    )
  }

  if (type === 'opex-only') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: '#6BFFEB' }}
        />
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">OPEX Economia/mês</span>
          <span className="text-[12px] font-black text-white">{fmtCompact(opex)}</span>
        </div>
        <Tooltip content="OPEX: Economia mensal operacional gerada pela automação." />
      </div>
    )
  }
}
