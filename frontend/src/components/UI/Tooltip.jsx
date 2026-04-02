import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Tooltip({ content }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'bottom' })
  const triggerRef = useRef(null)

  function computePosition() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const placement = spaceBelow < 80 ? 'top' : 'bottom'
    const tooltipHalfWidth = 110 // metade do max-w-[220px]
    const margin = 8
    const centerLeft = rect.left + rect.width / 2
    const clampedLeft = Math.min(
      window.innerWidth - tooltipHalfWidth - margin,
      Math.max(tooltipHalfWidth + margin, centerLeft)
    )
    setCoords({
      top: placement === 'bottom' ? rect.bottom + 6 : rect.top - 6,
      left: clampedLeft,
      placement,
    })
  }

  function show() {
    computePosition()
    setVisible(true)
  }

  function hide() {
    setVisible(false)
  }

  if (!content) return null

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex cursor-help text-gray-600 transition-colors hover:text-gray-400"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </span>

      {visible &&
        createPortal(
          <span
            style={{
              position: 'fixed',
              top: coords.placement === 'bottom' ? coords.top : undefined,
              bottom: coords.placement === 'top' ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              transform: 'translateX(-50%)',
              zIndex: 99999,
              pointerEvents: 'none',
            }}
            className="tooltip-content block w-max max-w-[220px] rounded-xl border px-3 py-2 text-[11px] font-normal normal-case leading-relaxed tracking-normal shadow-2xl bg-gray-900 text-gray-300 border-white/10"
          >
            {content}
          </span>,
          document.body
        )}
    </>
  )
}
