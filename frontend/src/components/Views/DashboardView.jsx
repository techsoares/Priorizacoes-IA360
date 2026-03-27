import { useState } from 'react'
import FilterBar from '../Dashboard/FilterBar'
import SummaryCards from '../Dashboard/SummaryCards'
import InitiativeTable from '../InitiativeTable/InitiativeTable'

export default function DashboardView({
  initiatives,
  filteredInitiatives,
  filters,
  onFilterChange,
  onReorder,
  onUpdateField,
}) {
  const [selectedId, setSelectedId] = useState(null)

  const selectedInitiative = selectedId
    ? filteredInitiatives.find((i) => i.id === selectedId)
    : null

  const summaryData = selectedInitiative ? [selectedInitiative] : filteredInitiatives

  return (
    <>
      <SummaryCards
        initiatives={summaryData}
        selectedInitiative={selectedInitiative}
        onClearSelection={() => setSelectedId(null)}
      />

      <div className="mb-4 flex items-center justify-end">
        <FilterBar
          initiatives={initiatives}
          filters={filters}
          onFilterChange={onFilterChange}
        />
      </div>

      <InitiativeTable
        initiatives={filteredInitiatives}
        onReorder={onReorder}
        onUpdateField={onUpdateField}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </>
  )
}
