import { useMemo } from 'react'

export default function FilterBar({ initiatives, filters, onFilterChange }) {
  const options = useMemo(() => {
    const areas = new Set()
    const statuses = new Set()
    const assignees = new Set()

    initiatives.forEach((i) => {
      if (i.cost_center) areas.add(i.cost_center)
      if (i.jira_status) statuses.add(i.jira_status)
      if (i.assignee) assignees.add(i.assignee)
    })

    return {
      areas: [...areas].sort(),
      statuses: [...statuses].sort(),
      assignees: [...assignees].sort(),
    }
  }, [initiatives])

  const activeCount = Object.values(filters).filter(Boolean).length

  function handleChange(key, value) {
    onFilterChange({ ...filters, [key]: value || '' })
  }

  function clearAll() {
    onFilterChange({ area: '', status: '', assignee: '' })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
      </div>

      <FilterSelect
        label="Área responsável"
        value={filters.area}
        options={options.areas}
        onChange={(v) => handleChange('area', v)}
      />

      <FilterSelect
        label="Status"
        value={filters.status}
        options={options.statuses}
        onChange={(v) => handleChange('status', v)}
      />

      <FilterSelect
        label="Responsável"
        value={filters.assignee}
        options={options.assignees}
        onChange={(v) => handleChange('assignee', v)}
      />

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="text-xs text-accent-purple-light hover:text-accent-purple transition-colors flex items-center gap-1 ml-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpar ({activeCount})
        </button>
      )}
    </div>
  )
}

function FilterSelect({ label, value, options, onChange }) {
  if (options.length === 0) return null

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-sm rounded-lg px-3 py-2 border transition-all cursor-pointer appearance-none pr-8 bg-no-repeat bg-[length:16px] bg-[right_8px_center] ${
        value
          ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple-light'
          : 'bg-surface-card border-white/10 text-gray-400 hover:border-accent-purple/30'
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239B5DE5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
      }}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}
