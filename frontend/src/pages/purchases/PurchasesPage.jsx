import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { purchasesService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import FilterBar, { FilterSelect, FilterDate } from '../../components/ui/FilterBar'
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/helpers'
import { Plus, ShoppingCart, FileText, Eye, Download } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const PurchasesPage = () => {
  const { isStoreManager } = useAuth()
  const [data, setData] = useState({ purchases: [], total: 0, page: 1 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '' })

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await purchasesService.getAll({ page, limit: 20, ...filters })
      const d = res.data
      setData({ purchases: d.data, total: d.pagination.total, page })
    } catch { toast.error('Failed to load purchases') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchData(1) }, [filters])

  const handleDownloadPDF = async (id, billNo) => {
    try {
      const res = await purchasesService.getPDF(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${billNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Failed to generate PDF') }
  }

  const columns = [
    { header: 'Bill No', key: 'billNo', render: (v, row) => <Link to={`/purchases/${row.id}`} className="text-blue-600 hover:underline font-medium font-mono">{v}</Link> },
    { header: 'Supplier', key: 'supplier', render: (v) => v?.supplierName || '—' },
    { header: 'Project/Site', key: 'project', render: (v, row) => <div><p className="text-xs">{v?.projectName || '—'}</p><p className="text-xs text-gray-500">{row.site?.siteName || ''}</p></div> },
    { header: 'Date', key: 'purchaseDate', render: (v) => formatDate(v) },
    { header: 'Items', key: 'items', render: (v) => <span className="badge-blue">{v?.length || 0}</span> },
    { header: 'Amount', key: 'totalAmount', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { header: 'Status', key: 'status', render: (v) => <span className={getStatusBadge(v)}>{v}</span> },
    {
      header: 'Actions', key: 'id', render: (v, row) => (
        <div className="flex items-center gap-1">
          <Link to={`/purchases/${v}`} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Eye size={14} /></Link>
          {row.status === 'RECEIVED' && <button onClick={() => handleDownloadPDF(v, row.billNo)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><Download size={14} /></button>}
        </div>
      )
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24} /> Purchases</h1>
          <p className="page-subtitle">Manage purchase orders and receipts</p>
        </div>
        <Link to="/purchases/new" className="btn-primary"><Plus size={16} /> New Purchase</Link>
      </div>

      <FilterBar filters={filters} onClear={() => setFilters({ status: '', fromDate: '', toDate: '' })}>
        <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={STATUS_OPTIONS} />
        <FilterDate label="From" value={filters.fromDate} onChange={(v) => setFilters((f) => ({ ...f, fromDate: v }))} />
        <FilterDate label="To" value={filters.toDate} onChange={(v) => setFilters((f) => ({ ...f, toDate: v }))} />
      </FilterBar>

      <DataTable columns={columns} data={data.purchases} total={data.total} page={data.page} loading={loading}
        onPageChange={(p) => fetchData(p)} searchPlaceholder="Search by bill number..." />
    </div>
  )
}

export default PurchasesPage
