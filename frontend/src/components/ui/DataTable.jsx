import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react'

const DataTable = ({
  columns,
  data = [],
  total = 0,
  page = 1,
  limit = 20,
  loading = false,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  actions,
  emptyText = 'No records found',
}) => {
  const [searchValue, setSearchValue] = useState('')
  const totalPages = Math.ceil(total / limit)

  const handleSearch = (e) => {
    e.preventDefault()
    if (onSearch) onSearch(searchValue)
  }

  return (
    <div className="card">
      {/* Toolbar */}
      {(onSearch || actions) && (
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          {onSearch && (
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="input pl-9 py-1.5"
                />
              </div>
              <button type="submit" className="btn-primary btn-sm">Search</button>
              {searchValue && (
                <button type="button" onClick={() => { setSearchValue(''); if (onSearch) onSearch('') }} className="btn-secondary btn-sm">Clear</button>
              )}
            </form>
          )}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </div>
      )}

      {/* Table */}
      <div className="table-container rounded-none border-0">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={{ width: col.width }} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-500">{emptyText}</td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={col.cellClassName}>
                      {col.render ? col.render(row[col.key], row, rowIdx) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{Math.min((page - 1) * limit + 1, total)}</span>
            {' '}–{' '}
            <span className="font-medium">{Math.min(page * limit, total)}</span>
            {' '}of{' '}
            <span className="font-medium">{total}</span> results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="btn-secondary btn-sm px-2 py-1.5 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) pageNum = i + 1
              else if (page <= 3) pageNum = i + 1
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
              else pageNum = page - 2 + i
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={`btn-sm px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${page === pageNum ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="btn-secondary btn-sm px-2 py-1.5 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
