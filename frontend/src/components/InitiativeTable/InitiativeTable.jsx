import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import SortableRow from './SortableRow'
import Tooltip from '../UI/Tooltip'

const COLUMNS = [
  { key: 'priority_order', label: '#', width: 'w-[3%]' },
  { key: 'jira_key', label: 'Jira', width: 'w-[5%]' },
  { key: 'summary', label: 'Iniciativa', width: 'w-[15%]' },
  { key: 'assignee', label: 'Responsável', width: 'w-[7%]' },
  { key: 'jira_status', label: 'Status', width: 'w-[7%]', badge: true },
  { key: 'hours_saved', label: 'Horas Econ.', width: 'w-[5%]', editable: true },
  { key: 'cost_per_hour', label: 'R$/Hora', width: 'w-[5%]', editable: true },
  { key: 'headcount_reduction', label: 'Red. HC', width: 'w-[5%]', editable: true },
  { key: 'monthly_employee_cost', label: 'Custo Func.', width: 'w-[5%]', editable: true },
  { key: 'cloud_infra_cost', label: 'Custo Infra', width: 'w-[5%]', editable: true },
  { key: 'maintenance_hours', label: 'H. Manut.', width: 'w-[5%]', editable: true },
  { key: 'tech_hour_cost', label: 'R$/H Técn.', width: 'w-[5%]', editable: true },
  {
    key: 'total_gains',
    label: 'Ganhos',
    width: 'w-[7%]',
    computed: true,
    tooltip: 'Ganhos = (Horas Econ. × R$/Hora)\n+ (Red. HC × Custo Func.)\n+ (Aum. Prod. × Valor Tarefa)',
  },
  {
    key: 'total_costs',
    label: 'Custos',
    width: 'w-[7%]',
    computed: true,
    tooltip: 'Custos = (Tokens × Custo/Token)\n+ Custo Infra\n+ (H. Manut. × R$/H Técn.)',
  },
  {
    key: 'roi_percent',
    label: 'ROI (%)',
    width: 'w-[6%]',
    computed: true,
    tooltip: 'ROI = ((Ganhos - Custos) / Custos) × 100',
  },
  {
    key: 'payback_months',
    label: 'Payback',
    width: 'w-[6%]',
    computed: true,
    tooltip: 'Payback = (Custos × 12) / Ganhos\nResultado em meses.',
  },
]

export default function InitiativeTable({
  initiatives,
  onReorder,
  onUpdateField,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = initiatives.findIndex((i) => i.id === active.id)
    const newIndex = initiatives.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(initiatives, oldIndex, newIndex)
    onReorder(reordered)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-surface-card rounded-xl shadow-sm overflow-x-auto border border-accent-purple/10">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-accent-purple-dark to-primary-dark text-white">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`${col.width} px-3 py-3 text-left font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.tooltip && <Tooltip content={col.tooltip} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <SortableContext
            items={initiatives.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {initiatives.map((initiative, index) => (
                <SortableRow
                  key={initiative.id}
                  initiative={initiative}
                  index={index}
                  columns={COLUMNS}
                  onUpdateField={onUpdateField}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>

        {initiatives.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Nenhuma iniciativa encontrada.</p>
            <p className="text-xs text-gray-600 mt-1">Sincronize com o Jira ou ajuste os filtros.</p>
          </div>
        )}
      </div>
    </DndContext>
  )
}
