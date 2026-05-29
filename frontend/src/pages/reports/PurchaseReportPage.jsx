import { useState, useEffect, useCallback } from 'react'
import { reportsService, suppliersService } from '../../services'
import FilterBar, { FilterSelect, FilterDate } from '../../components/ui/FilterBar'
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/helpers'
import { ShoppingCart, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const PurchaseReportPage = () => {
  const [data, setData] = useState({ purchases: [], summary: [] })
  const [suppliers, setSuppliers] = useState([])
  const [filters, setFilters] = useState({ supplierId: '', fromDate: '', toDate: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    suppliersService.getAll({ limit: 200 }).then(({ data: d }) => setSuppliers(d.data || []))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportsService.getSupplierPurchases(filters)
      setData(res.data.data || { purchases: [], summary: [] })
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchData() }, [filters])

  const totalAmount = data.purchases?.reduce((s, p) => s + parseFloat(p.totalAmount || 0), 0) || 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24} /> Purchase Report</h1>
          <p className="page-subtitle">Supplier-wise purchase analysis</p>
        </div>
      </div>

      <div className="bg-blue-600 text-white rounded-xl p-4 mb-4">
        <p className="text-blue-100 text-sm">Total Purchase Value (filtered)</p>
        <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
      </div>

      <FilterBar filters={filters} onClear={() => setFilters({ supplierId: '', fromDate: '', toDate: '' })}>
        <FilterSelect label="Supplier" value={filters.supplierId} onChange={(v) => setFilters((f) => ({ ...f, supplierId: v }))} options={suppliers.map((s) => ({ value: s.id, label: s.supplierName }))} />
        <FilterDate label="From" value={filters.fromDate} onChange={(v) => setFilters((f) => ({ ...f, fromDate: v }))} />
        <FilterDate label="To" value={filters.toDate} onChange={(v) => setFilters((f) => ({ ...f, toDate: v }))} />
      </FilterBar>

      <div className="card">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead><tr><th>#</th><th>Bill No</th><th>Supplier</th><th>Date</th><th>Items</th><th>GST</th><th>Total</th><th>Status</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : data.purchases?.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-500">No purchases found</td></tr>
              ) : data.purchases?.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td>{i + 1}</td>
                  <td className="font-mono font-medium">{p.billNo}</td>
                  <td>{p.supplier?.supplierName}</td>
                  <td>{formatDate(p.purchaseDate)}</td>
                  <td><span className="badge-blue">{p.items?.length}</span></td>
                  <td>{formatCurrency(p.gstAmount)}</td>
                  <td className="font-semibold">{formatCurrency(p.totalAmount)}</td>
                  <td><span className={getStatusBadge(p.status)}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PurchaseReportPage
