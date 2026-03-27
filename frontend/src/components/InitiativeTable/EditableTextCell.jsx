import { useState, useEffect, useRef } from 'react'

export default function EditableTextCell({ value, field, onSave, placeholder = 'Clique para adicionar...' }) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value ?? '')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!editing) setLocalValue(value ?? '')
  }, [value, editing])

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus()
  }, [editing])

  function commit(val) {
    const trimmed = val.trim()
    const original = (value ?? '').trim()
    if (trimmed !== original) {
      onSave(field, trimmed)
    }
    setEditing(false)
  }

  function handleOpen(e) {
    e.stopPropagation()
    setEditing(true)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
        <textarea
          ref={textareaRef}
          rows={3}
          className="w-full min-w-[200px] resize-none rounded border border-[#3559EB]/40 bg-surface px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3559EB]"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setLocalValue(value ?? '')
              setEditing(false)
            }
          }}
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); commit(localValue) }}
            className="rounded bg-[#3559EB]/80 px-2 py-0.5 text-[10px] text-white hover:bg-[#3559EB]"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLocalValue(value ?? ''); setEditing(false) }}
            className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-gray-400 hover:bg-white/10"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <span
      className="block max-w-[220px] cursor-pointer truncate rounded px-2 py-1 text-xs text-gray-400 hover:bg-[#3559EB]/10 hover:text-gray-200"
      onClick={handleOpen}
      title={value || placeholder}
    >
      {value || <span className="text-gray-600">{placeholder}</span>}
    </span>
  )
}
