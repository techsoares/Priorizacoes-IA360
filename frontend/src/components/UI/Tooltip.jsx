import { useState } from 'react'

export default function Tooltip({ content }) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="text-gray-500 hover:text-primary-light transition-colors w-4 h-4 rounded-full border border-gray-600 hover:border-primary-light inline-flex items-center justify-center text-xs font-bold"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        aria-label="Informação"
      >
        i
      </button>
      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-surface text-gray-200 text-xs rounded-lg p-3 shadow-lg whitespace-pre-line border border-white/10">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface" />
        </div>
      )}
    </span>
  )
}
