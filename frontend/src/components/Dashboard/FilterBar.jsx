import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_FILTERS = {
  activityType: '',
  statusOperator: 'not_equals',
  statuses: ['Concluído', 'Cancelado'],
  assignee: '',
}

export default function FilterBar({
  initiatives,
  filters,
  onFilterChange,
  showStatus = true,
  showAssignee = true,
}) {
  const options = useMemo(() => {
    const activityTypes = new Set()
    const statuses = new Set()
    const assignees = new Set()

    initiatives.forEach((initiative) => {
      if (initiative.activity_type) activityTypes.add(initiative.activity_type)
      if (initiative.jira_status) statuses.add(initiative.jira_status)
      if (initiative.assignee) assignees.add(initiative.assignee)
    })

    return {
      activityTypes: [...activityTypes].sort(),
      statuses: [...statuses].sort(),
      assignees: [...assignees].sort(),
    }
  }, [initiatives])

  const activeCount = [
    filters.activityType,
    filters.assignee,
    filters.statuses?.length ? 'status' : '',
  ].filter(Boolean).length

  function handleChange(key, value) {
    onFilterChange({ ...filters, [key]: value || '' })
  }

  function handleStatusesChange(statuses) {
    onFilterChange({ ...filters, statuses })
  }

  function handleStatusOperatorChange(statusOperator) {
    onFilterChange({ ...filters, statusOperator })
  }

  function clearAll() {
    onFilterChange({ ...DEFAULT_FILTERS })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
      </div>

      <SingleSelectFilter
        label="Tipo de atividade"
        value={filters.activityType}
        options={options.activityTypes}
        onChange={(value) => handleChange('activityType', value)}
      />

      {showStatus && (
        <StatusMultiFilter
          operator={filters.statusOperator}
          selectedStatuses={filters.statuses}
          options={options.statuses}
          onOperatorChange={handleStatusOperatorChange}
          onSelectionChange={handleStatusesChange}
        />
      )}

      {showAssignee && (
        <SingleSelectFilter
          label="Responsável"
          value={filters.assignee}
          options={options.assignees}
          onChange={(value) => handleChange('assignee', value)}
        />
      )}

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="ml-1 flex items-center gap-1 text-xs text-[#3DB7F4] transition-colors hover:text-[#FE70BD]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpar ({activeCount})
        </button>
      )}
    </div>
  )
}

function SingleSelectFilter({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const isDisabled = options.length === 0

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(option) {
    onChange(option)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && setOpen((current) => !current)}
        className={`inline-flex items-center justify-between gap-2 rounded-full border px-3 py-1 text-xs transition-all ${
          isDisabled
            ? 'cursor-not-allowed border-white/8 bg-white/5 text-gray-600'
            : value
              ? 'border-[#3559EB]/40 bg-[#3559EB]/15 text-[#3DB7F4]'
              : 'border-white/10 bg-surface-card text-gray-300 hover:border-[#3559EB]/30'
        }`}
      >
        <span className="truncate">{value || label}</span>
        {!isDisabled ? (
          <svg
            className={`h-3 w-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : null}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-40 min-w-[240px] rounded-2xl border border-white/10 bg-surface-card p-3 shadow-[0_0_30px_rgba(53,89,235,0.12)]">
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              !value
                ? 'bg-[#3559EB]/15 text-[#3DB7F4]'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <span>{label}</span>
            {!value ? <span className="text-xs uppercase tracking-[0.2em] text-gray-500">Todos</span> : null}
          </button>

          <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  value === option
                    ? 'bg-[#3559EB]/15 text-[#3DB7F4]'
                    : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="truncate">{option}</span>
                {value === option ? (
                  <span className="text-xs uppercase tracking-[0.2em] text-[#3DB7F4]">Ativo</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusMultiFilter({
  operator,
  selectedStatuses,
  options,
  onOperatorChange,
  onSelectionChange,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const disabled = options.length === 0

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleStatus(status) {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((item) => item !== status)
      : [...selectedStatuses, status]
    onSelectionChange(next)
  }

  const summary =
    selectedStatuses.length === 0
      ? 'Status'
      : `${operator === 'not_equals' ? 'Excluindo' : 'Apenas'}: ${selectedStatuses.join(', ')}`

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((value) => !value)}
        className={`rounded-full border px-3 py-1 text-xs transition-all ${
          disabled
            ? 'cursor-not-allowed border-white/8 bg-white/5 text-gray-600'
            : selectedStatuses.length > 0
              ? 'border-[#3559EB]/40 bg-[#3559EB]/15 text-[#3DB7F4]'
              : 'border-white/10 bg-surface-card text-gray-300 hover:border-[#3559EB]/30'
        }`}
      >
        {summary}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-80 rounded-2xl border border-white/10 bg-surface-card p-4 shadow-[0_0_30px_rgba(53,89,235,0.12)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Status
            </span>
            <button
              type="button"
              onClick={() => onSelectionChange([])}
              className="text-xs text-gray-400 transition-colors hover:text-[#FE70BD]"
            >
              Limpar
            </button>
          </div>

          <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => onOperatorChange('equals')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                operator === 'equals'
                  ? 'bg-[#3559EB] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              =
            </button>
            <button
              type="button"
              onClick={() => onOperatorChange('not_equals')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                operator === 'not_equals'
                  ? 'bg-[#FE70BD] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              !=
            </button>
          </div>

          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {options.map((status) => (
              <label
                key={status}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/6 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-[#3559EB]/20 hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-[#3559EB] focus:ring-[#3559EB]"
                />
                <span>{status}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
