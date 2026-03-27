import { useState, useEffect, useRef } from 'react'

export default function EditableCell({ value, field, onSave }) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value ?? '')
  const inputRef = useRef(null)

  useEffect(() => {
    setLocalValue(value ?? '')
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function handleBlur() {
    setEditing(false)
    const numericValue = parseFloat(localValue) || 0
    if (numericValue !== (value ?? 0)) {
      onSave(field, numericValue)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.target.blur()
    }
    if (e.key === 'Escape') {
      setLocalValue(value ?? '')
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        min="0"
        className="w-full px-2 py-1 text-sm border border-accent-purple rounded bg-surface text-white focus:outline-none focus:ring-1 focus:ring-accent-purple"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <span
      className="cursor-pointer px-2 py-1 rounded text-sm block text-gray-300 border border-transparent hover:border-[#3559EB]/40 hover:bg-accent-purple/10 transition-colors group relative"
      onClick={() => setEditing(true)}
      title="Clique para editar"
    >
      {value != null && value !== 0
        ? typeof value === 'number'
          ? value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
          : value
        : <span className="text-gray-600 text-xs italic">editar</span>}
    </span>
  )
}
