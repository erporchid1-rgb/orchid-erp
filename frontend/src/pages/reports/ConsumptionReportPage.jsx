import { useState, useEffect, useCallback } from 'react'
import { reportsService, projectsService, sitesService } from '../../services'
import FilterBar, { FilterSelect, FilterDate } from '../../components/ui/FilterBar'
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers'
import { BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ConsumptionReportPage = () => {
  const [data, setData] = useState({ movements: [], summary: [] })
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [filters, setFilters] = useState({ projectId: '', siteId: '', fromDate: '', toDate: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { projectsService.getAll({ limit: 100 }).then(({ data: d }) => setProjects(d.data || [])) }, [])

  useEffect(() => {
    if (filters.projectId) sitesService.getByProject(filters.projectId).then(({ data: d }) => setSites(d.data || []))
  }, [filters.projectId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportsService.getSiteConsumption(filters)
      setData(res.data.data || { movements: [], summary: [] })
    } catch { toast.error('Failed') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchData() }, [filters])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={24} /> Site Consumption Report</h1>
          <p className="page-subtitle">Material consumption by site and project</p>
        </div>
      </div>

      <FilterBar filters={filters} onClear={() => setFilters({ projectId: '', siteId: '', fromDate: '', toDate: '' })}>
        <FilterSelect label="Project" value={filters.projectId} onChange={(v) => setFilters((f) => ({ ...f, projectId: v, siteId: '' }))} options={projects.map((p) => ({ value: p.id, label: p.projectName }))} />
        {sites.length > 0 && <FilterSelect label="Site" value={filters.siteId} onChange={(v) => setFilters((f) => ({ ...f, siteId: v }))} options={sites.map((s) => ({ value: s.id, label: s.siteName }))} />}
        <FilterDate label="From" value={filters.fromDate} onChange={(v) => setFilters((f) => ({ ...f, fromDate: v }))} />
        <FilterDate label="To" value={filters.toDate} onChange={(v) => setFilters((f) => ({ ...f, toDate: v }))} />
      </FilterBar>

      {/* Summary */}
      {data.summary?.length > 0 && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Consumption Summary</h3></div>
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead><tr><th>#</th><th>Material</th><th>Category</th><th>Unit</th><th>Total Consumed</th><th>Value</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data.summary.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td>{i + 1}</td>
                    <td className="font-medium">{row.materialName}</td>
                    <td><span className="badge-blue">{row.category}</span></td>
                    <td>{row.unit}</td>
                    <td className="font-bold text-red-700">{formatNumber(row.totalConsumed, 3)}</td>
                    <td>{formatCurrency(row.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movement Details */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-800">Issue Details</h3></div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead><tr><th>#</th><th>Date</th><th>Material</th><th>Category</th><th>Site/Project</th><th>Quantity</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : data.movements?.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No consumption data</td></tr>
              ) : data.movements?.map((m, i) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td>{i + 1}</td>
                  <td>{formatDate(m.movementDate)}</td>
                  <td className="font-medium">{m.material?.materialName}</td>
                  <td><span className="badge-blue">{m.material?.category?.name}</span></td>
                  <td>{m.site?.siteName || m.project?.projectName || '—'}</td>
                  <td className="font-semibold text-red-700">{formatNumber(m.quantity, 3)} {m.material?.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ConsumptionReportPage
