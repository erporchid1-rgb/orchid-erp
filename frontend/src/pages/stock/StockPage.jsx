import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { stockService, materialsService, projectsService, sitesService } from '../../services'
import FilterBar, { FilterSelect } from '../../components/ui/FilterBar'
import { formatNumber, formatCurrency } from '../../utils/helpers'
import { Warehouse, AlertTriangle, TrendingDown, BarChart2, BookOpen, PackagePlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const StockPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stock, setStock] = useState([])
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ categoryId: '', projectId: '', siteId: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      materialsService.getCategories(),
      projectsService.getAll({ limit: 100 }),
      stockService.getSummary(),
    ]).then(([c, p, s]) => {
      setCategories(c.data.data || [])
      setProjects(p.data.data || [])
      setSummary(s.data.data)
    })
  }, [])

  useEffect(() => {
    if (filters.projectId) {
      sitesService.getByProject(filters.projectId).then(({ data }) => setSites(data.data || []))
    } else { setSites([]) }
  }, [filters.projectId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await stockService.getCurrent(filters)
      setStock(res.data.data || [])
    } catch { toast.error('Failed to load stock') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchData() }, [filters])

  const filtered = search ? stock.filter((s) => s.materialName.toLowerCase().includes(search.toLowerCase())) : stock
  const lowStockCount = stock.filter((s) => s.isLowStock).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Warehouse size={24} /> Current Stock</h1>
          <p className="page-subtitle">Live stock levels calculated from ledger</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={() => navigate('/stock/opening')} className="btn-primary">
            <PackagePlus size={16} />
            Opening Stock Entry
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Materials', value: summary.totalMaterials, color: 'bg-blue-600', icon: Warehouse },
            { label: 'Stock Value', value: formatCurrency(summary.totalStockValue), color: 'bg-green-600', icon: TrendingDown },
            { label: 'Low Stock', value: summary.lowStockCount, color: 'bg-amber-500', icon: AlertTriangle },
            { label: 'Out of Stock', value: summary.outOfStockCount, color: 'bg-red-600', icon: AlertTriangle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <FilterBar filters={filters} onClear={() => setFilters({ categoryId: '', projectId: '', siteId: '' })}>
        <FilterSelect label="Category" value={filters.categoryId} onChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
          options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <FilterSelect label="Project" value={filters.projectId} onChange={(v) => setFilters((f) => ({ ...f, projectId: v, siteId: '' }))}
          options={projects.map((p) => ({ value: p.id, label: p.projectName }))} />
        {sites.length > 0 && (
          <FilterSelect label="Site" value={filters.siteId} onChange={(v) => setFilters((f) => ({ ...f, siteId: v }))}
            options={sites.map((s) => ({ value: s.id, label: s.siteName }))} />
        )}
      </FilterBar>

      {/* Search */}
      <div className="card mb-4 px-4 py-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials..." className="input max-w-sm py-1.5" />
      </div>

      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800 font-medium">{lowStockCount} material(s) are below minimum stock level</p>
          <Link to="/reports/low-stock" className="ml-auto text-xs text-amber-700 underline">View Report</Link>
        </div>
      )}

      <div className="card">
        <div className="table-container rounded-none border-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Loading stock data...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Min. Stock</th>
                  <th>Stock Value</th>
                  <th>Status</th>
                  <th>Ledger</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-gray-500 text-sm">No stock data</td></tr>
                ) : filtered.map((item, i) => (
                  <tr key={item.materialId} className={`hover:bg-gray-50 ${item.isLowStock ? 'bg-red-50/30' : ''}`}>
                    <td>{i + 1}</td>
                    <td className="font-medium text-gray-900">{item.materialName}</td>
                    <td><span className="badge-blue">{item.category}</span></td>
                    <td>{item.unit}</td>
                    <td className={`font-bold ${item.currentStock === 0 ? 'text-red-600' : item.isLowStock ? 'text-amber-600' : 'text-green-700'}`}>
                      {formatNumber(item.currentStock, 3)}
                    </td>
                    <td className="text-gray-600">{formatNumber(item.minimumStock, 0)}</td>
                    <td>{formatCurrency(item.stockValue)}</td>
                    <td>
                      {item.currentStock === 0 ? <span className="badge-red">Out of Stock</span>
                        : item.isLowStock ? <span className="badge-yellow flex items-center gap-1"><AlertTriangle size={10} /> Low</span>
                          : <span className="badge-green">OK</span>}
                    </td>
                    <td>
                      <Link to={`/stock/ledger/${item.materialId}`} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 inline-flex" title="View Ledger">
                        <BookOpen size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default StockPage
