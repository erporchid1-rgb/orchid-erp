import { Filter, X } from 'lucide-react'

const FilterBar = ({ filters, onFilterChange, onClear, children }) => {
  const hasFilters = filters && Object.values(filters).some(Boolean)

  return (
    <div className="card mb-4">
      <div className="px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter size={15} />
          <span>Filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {children}
        </div>
        {hasFilters && (
          <button onClick={onClear} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium">
            <X size={13} /> Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}

export const FilterSelect = ({ label, value, onChange, options, placeholder = 'All' }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">{label}:</label>
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="input py-1.5 text-xs min-w-[120px]">
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
)

export const FilterDate = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">{label}:</label>
    <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} className="input py-1.5 text-xs" />
  </div>
)

export default FilterBar
