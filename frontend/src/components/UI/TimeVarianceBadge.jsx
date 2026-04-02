import { getTimeVarianceStatus, getTimeVarianceColor } from '../../utils/initiativeInsights'

export default function TimeVarianceBadge({ variance, size = 'sm', showLabel = true }) {
  if (variance === null || variance === undefined) {
    return <span className="text-[10px] text-gray-700">—</span>
  }

  const status = getTimeVarianceStatus(variance)
  const color = getTimeVarianceColor(variance)
  const isOnTime = Math.abs(variance) <= 10

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px]',
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-2.5 py-1.5 text-[11px]',
    lg: 'px-3 py-2 text-[12px]',
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-bold inline-flex items-center gap-1 rounded-full ${sizeClasses[size]}`}
        style={{
          backgroundColor: `${color}15`,
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        {variance > 0 ? '⚠️' : '✅'}
        {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
      </span>
      {showLabel && <span className={`font-medium text-gray-600 ${size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : 'text-[11px]'}`}>{status}</span>}
    </div>
  )
}
