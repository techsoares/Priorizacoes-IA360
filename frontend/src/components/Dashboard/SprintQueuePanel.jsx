import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const ACTIVITY_TYPES = ['Produto', 'Governança']

function formatROI(value) {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${Math.round(value)}%`
}

function PanelItem({ initiativeId, initiatives, isAdmin }) {
  const initiative = initiatives.find((i) => i.id === initiativeId)
  const roi = initiative?.metrics?.roi_percent

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `panel-${initiativeId}`,
    data: { type: 'panel', initiativeId },
    disabled: !isAdmin,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 text-xs"
    >
      {isAdmin && (
        <span
          {...listeners}
          className="cursor-grab shrink-0 text-gray-700 active:cursor-grabbing hover:text-gray-500"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </span>
      )}
      <span className="flex-1 truncate text-[12px] text-gray-300">
        {initiative?.summary || initiative?.jira_key || initiativeId}
      </span>
      <span
        className={`shrink-0 font-mono text-[10px] ${
          roi == null ? 'text-gray-700' : roi >= 0 ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {formatROI(roi)}
      </span>
    </div>
  )
}

function DroppableList({ activityType, items, initiatives, isAdmin }) {
  const droppableId = `panel-${activityType}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          {activityType}
        </span>
        <span className={`text-[10px] ${items.length >= 5 ? 'text-yellow-500' : 'text-gray-700'}`}>
          {items.length}/5
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[52px] rounded-xl border transition-all ${
          isOver
            ? 'border-primary/40 bg-primary/5 shadow-[0_0_12px_rgba(61,183,244,0.1)]'
            : 'border-white/[0.04] bg-white/[0.01]'
        } flex flex-col gap-1 p-1.5`}
      >
        <SortableContext
          items={items.map((i) => `panel-${i.initiative_id}`)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <PanelItem
              key={item.initiative_id}
              initiativeId={item.initiative_id}
              initiatives={initiatives}
              isAdmin={isAdmin}
            />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-2 text-[11px] text-gray-700">
            {isAdmin ? 'Arraste iniciativas aqui' : 'Nenhuma iniciativa'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SprintQueuePanel({ queue, initiatives, isAdmin, toast }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`flex shrink-0 flex-col rounded-xl border border-white/[0.05] bg-surface-card/50 shadow-glow-sm transition-all duration-200 overflow-y-auto max-h-[calc(100vh-280px)] ${
        collapsed ? 'w-10 items-center' : 'w-80'
      }`}
    >
      {/* Header — mesmo padrão do thead da tabela */}
      <div
        className={`sticky top-0 z-10 flex shrink-0 items-center bg-surface-elevated/90 backdrop-blur-sm border-b border-white/[0.04] transition-all ${
          collapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
        }`}
      >
        {!collapsed && (
          <span className="flex-1 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
            Priorizações Comitê IA360°
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expandir painel' : 'Recolher painel'}
          className="rounded-lg p-1 text-gray-600 transition-colors hover:bg-white/[0.04] hover:text-gray-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'}
            />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3 p-3">
          {ACTIVITY_TYPES.map((type) => (
            <DroppableList
              key={type}
              activityType={type}
              items={queue[type] || []}
              initiatives={initiatives}
              isAdmin={isAdmin}
            />
          ))}

          {!isAdmin && (
            <p className="text-center text-[10px] text-gray-700">
              Somente admins podem priorizar
            </p>
          )}

          {toast && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-2 text-center text-[11px] text-yellow-400">
              {toast}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
