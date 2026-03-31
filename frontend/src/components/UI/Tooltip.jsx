import { useState, useRef, useEffect } from 'react'

export default function Tooltip({ content }) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState('bottom')
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()

    if (triggerRect.bottom + tooltipRect.height + 8 > window.innerHeight) {
      setPosition('top')
    } else {
      setPosition('bottom')
    }
  }, [visible])

  if (!content) return null

  return (
    <span className="relative inline-flex" ref={triggerRef}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="cursor-help text-gray-600 transition-colors hover:text-gray-400"
        tabIndex={-1}
      >
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {visible && (
        <span
          ref={tooltipRef}
          className={`pointer-events-none absolute left-1/2 z-[9999] w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[11px] font-normal normal-case tracking-normal leading-relaxed text-gray-400 shadow-xl ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
