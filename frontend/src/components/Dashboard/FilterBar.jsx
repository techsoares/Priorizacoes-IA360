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
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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
          className="ml-1 flex items-center gap-1 text-[11px] text-gray-500 transition-colors hover:text-[#FE70BD]"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        className={`inline-flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
          isDisabled
            ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-gray-700'
            : value
              ? 'border-primary/25 bg-primary/8 text-[#3DB7F4]'
              : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/[0.1] hover:text-gray-300'
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
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 min-w-[220px] rounded-xl border border-white/[0.06] bg-surface-elevated p-2 shadow-glow-lg">
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors ${
              !value
                ? 'bg-primary/10 text-[#3DB7F4]'
                : 'text-gray-400 hover:bg-white/[0.03]'
            }`}
          >
            <span>{label}</span>
            {!value ? <span className="text-[10px] uppercase tracking-[0.15em] text-gray-600">Todos</span> : null}
          </button>

          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors ${
                  value === option
                    ? 'bg-primary/10 text-[#3DB7F4]'
                    : 'text-gray-400 hover:bg-white/[0.03]'
                }`}
              >
                <span className="truncate">{option}</span>
                {value === option ? (
                  <svg className="h-3 w-3 text-[#3DB7F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
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
        className={`rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
          disabled
            ? 'cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-gray-700'
            : selectedStatuses.length > 0
              ? 'border-primary/25 bg-primary/8 text-[#3DB7F4]'
              : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/[0.1] hover:text-gray-300'
        }`}
      >
        {summary}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-72 rounded-xl border border-white/[0.06] bg-surface-elevated p-3 shadow-glow-lg">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              Status
            </span>
            <button
              type="button"
              onClick={() => onSelectionChange([])}
              className="text-[11px] text-gray-500 transition-colors hover:text-[#FE70BD]"
            >
              Limpar
            </button>
          </div>

          <div className="mb-3 inline-flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
            <button
              type="button"
              onClick={() => onOperatorChange('equals')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                operator === 'equals'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              =
            </button>
            <button
              type="button"
              onClick={() => onOperatorChange('not_equals')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                operator === 'not_equals'
                  ? 'bg-accent-pink text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              !=
            </button>
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto">
            {options.map((status) => (
              <label
                key={status}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-400 transition-colors hover:bg-white/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-transparent text-primary focus:ring-primary/50"
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
