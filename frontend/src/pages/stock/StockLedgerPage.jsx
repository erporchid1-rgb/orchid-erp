import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stockService } from '../../services'
import { formatNumber, formatDate, getMovementTypeLabel, getMovementTypeColor, formatCurrency } from '../../utils/helpers'
import { ArrowLeft, BookOpen, TrendingUp, TrendingDown } from 'lucide-react'
import FilterBar, { FilterDate } from '../../components/ui/FilterBar'
import toast from 'react-hot-toast'

const StockLedgerPage = () => {
  const { materialId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ fromDate: '', toDate: '' })

  useEffect(() => {
    setLoading(true)
    stockService.getLedger(materialId, { page, limit: 50, ...filters })
      .then(({ data }) => setResult(data))
      .catch(() => { toast.error('Failed to load ledger'); navigate('/stock') })
      .finally(() => setLoading(false))
  }, [materialId, page, filters])

  if (loading && !result) return <div className="py-12 text-center text-gray-500">Loading ledger...</div>

  const { data: { material, movements } = {}, pagination } = result || {}

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h1 className="page-title flex items-center gap-2"><BookOpen size={22} /> Stock Ledger</h1>
          {material && <p className="page-subtitle">{material.materialName} — {material.unit}</p>}
        </div>
      </div>

      <FilterBar filters={filters} onClear={() => setFilters({ fromDate: '', toDate: '' })}>
        <FilterDate label="From" value={filters.fromDate} onChange={(v) => setFilters((f) => ({ ...f, fromDate: v }))} />
        <FilterDate label="To" value={filters.toDate} onChange={(v) => setFilters((f) => ({ ...f, toDate: v }))} />
      </FilterBar>

      <div className="card">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Movement Type</th>
                <th>Site/Project</th>
                <th>Reference</th>
                <th>In (+)</th>
                <th>Out (−)</th>
                <th>Balance</th>
                <th>Rate</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-500 text-sm">Loading...</td></tr>
              ) : movements?.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-500 text-sm">No movements found</td></tr>
              ) : movements?.map((m) => {
                const isIn = ['PURCHASE', 'RETURN', 'TRANSFER_IN', 'ADJUSTMENT'].includes(m.movementType)
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td>{formatDate(m.movementDate)}</td>
                    <td>
                      <span className={`badge flex items-center gap-1 w-fit ${isIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isIn ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {getMovementTypeLabel(m.movementType)}
                      </span>
                    </td>
                    <td>{m.site?.siteName || m.project?.projectName || '—'}</td>
                    <td className="text-xs font-mono">{m.referenceType || '—'}</td>
                    <td className="text-green-700 font-semibold">{isIn ? formatNumber(m.quantity, 3) : '—'}</td>
                    <td className="text-red-600 font-semibold">{!isIn ? formatNumber(m.quantity, 3) : '—'}</td>
                    <td className="font-bold text-blue-700">{formatNumber(m.balanceAfter, 3)}</td>
                    <td>{m.rate ? formatCurrency(m.rate) : '—'}</td>
                    <td className="text-xs text-gray-500 max-w-[180px] truncate">{m.remarks || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">{pagination.total} movements total</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm">Prev</button>
              <span className="px-3 py-1.5 text-gray-600">Page {page} of {pagination.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StockLedgerPage
