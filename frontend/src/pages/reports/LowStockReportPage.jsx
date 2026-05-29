import { useState, useEffect } from 'react'
import { reportsService } from '../../services'
import { formatNumber } from '../../utils/helpers'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const LowStockReportPage = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsService.getLowStock()
      .then(({ data: d }) => setData(d.data || []))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><AlertTriangle size={24} className="text-amber-500" /> Low Stock Report</h1>
          <p className="page-subtitle">Materials below minimum stock threshold</p>
        </div>
      </div>

      {!loading && data.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">All Stock Levels OK</h3>
          <p className="text-gray-500 mt-1">No materials are below minimum stock levels.</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">{data.length} items need restocking</h3>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="table">
              <thead><tr><th>#</th><th>Material</th><th>Category</th><th>Unit</th><th>Current Stock</th><th>Min. Required</th><th>Shortage</th><th>Urgency</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-500">Loading...</td></tr>
                ) : data.map((item, i) => {
                  const pct = item.minimumStock > 0 ? (item.currentStock / item.minimumStock) * 100 : 0
                  const urgency = item.currentStock === 0 ? 'Critical' : pct < 25 ? 'High' : 'Medium'
                  const urgencyColor = item.currentStock === 0 ? 'badge-red' : pct < 25 ? 'badge-yellow' : 'badge-blue'
                  return (
                    <tr key={item.materialId} className={item.currentStock === 0 ? 'bg-red-50/40' : 'hover:bg-gray-50'}>
                      <td>{i + 1}</td>
                      <td className="font-medium text-gray-900">{item.materialName}</td>
                      <td><span className="badge-blue">{item.category}</span></td>
                      <td>{item.unit}</td>
                      <td className={`font-bold ${item.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatNumber(item.currentStock, 3)}
                      </td>
                      <td>{formatNumber(item.minimumStock, 0)}</td>
                      <td className="text-red-600 font-semibold">{formatNumber(item.shortage, 3)}</td>
                      <td><span className={urgencyColor}>{urgency}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default LowStockReportPage
