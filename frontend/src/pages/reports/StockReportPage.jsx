import { useState, useEffect, useCallback } from 'react'
import { reportsService, materialsService, projectsService, sitesService } from '../../services'
import FilterBar, { FilterSelect } from '../../components/ui/FilterBar'
import { formatNumber, formatCurrency } from '../../utils/helpers'
import { BarChart2, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const StockReportPage = () => {
  const [data, setData] = useState([])
  const [categories, setCategories] = useState([])
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [filters, setFilters] = useState({ categoryId: '', projectId: '', siteId: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([materialsService.getCategories(), projectsService.getAll({ limit: 100 })]).then(([c, p]) => {
      setCategories(c.data.data || [])
      setProjects(p.data.data || [])
    })
  }, [])

  useEffect(() => {
    if (filters.projectId) sitesService.getByProject(filters.projectId).then(({ data: d }) => setSites(d.data || []))
  }, [filters.projectId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportsService.getCurrentStock(filters)
      setData(res.data.data || [])
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchData() }, [filters])

  const totalValue = data.reduce((sum, d) => sum + d.stockValue, 0)

  const handleExportCSV = () => {
    const headers = ['Material', 'Category', 'Unit', 'Current Stock', 'Min Stock', 'Stock Value', 'Status']
    const rows = data.map((d) => [d.materialName, d.category, d.unit, d.currentStock, d.minimumStock, d.stockValue, d.isLowStock ? 'Low' : 'OK'])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock-report.csv'
    a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={24} /> Stock Report</h1>
          <p className="page-subtitle">Current stock levels across all materials</p>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary"><Download size={15} /> Export CSV</button>
      </div>

      {/* Total value banner */}
      <div className="bg-blue-600 text-white rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-blue-100 text-sm">Total Stock Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="text-right">
          <p className="text-blue-100 text-sm">Total Items</p>
          <p className="text-2xl font-bold">{data.length}</p>
        </div>
      </div>

      <FilterBar filters={filters} onClear={() => setFilters({ categoryId: '', projectId: '', siteId: '' })}>
        <FilterSelect label="Category" value={filters.categoryId} onChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect label="Project" value={filters.projectId} onChange={(v) => setFilters((f) => ({ ...f, projectId: v, siteId: '' }))} options={projects.map((p) => ({ value: p.id, label: p.projectName }))} />
        {sites.length > 0 && <FilterSelect label="Site" value={filters.siteId} onChange={(v) => setFilters((f) => ({ ...f, siteId: v }))} options={sites.map((s) => ({ value: s.id, label: s.siteName }))} />}
      </FilterBar>

      <div className="card">
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead><tr><th>#</th><th>Material</th><th>Category</th><th>Unit</th><th>Current Stock</th><th>Min Stock</th><th>Last Rate</th><th>Stock Value</th><th>Status</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-500">Loading report...</td></tr>
              ) : data.map((item, i) => (
                <tr key={item.materialId} className="hover:bg-gray-50">
                  <td>{i + 1}</td>
                  <td className="font-medium text-gray-900">{item.materialName}</td>
                  <td><span className="badge-blue">{item.category}</span></td>
                  <td>{item.unit}</td>
                  <td className={`font-bold ${item.currentStock === 0 ? 'text-red-600' : item.isLowStock ? 'text-amber-600' : 'text-green-700'}`}>{formatNumber(item.currentStock, 3)}</td>
                  <td>{formatNumber(item.minimumStock, 0)}</td>
                  <td>{item.lastRate ? formatCurrency(item.lastRate) : '—'}</td>
                  <td className="font-semibold">{formatCurrency(item.stockValue)}</td>
                  <td>{item.isLowStock ? <span className="badge-yellow">Low</span> : <span className="badge-green">OK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default StockReportPage
