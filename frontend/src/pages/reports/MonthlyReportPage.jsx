import { useState, useEffect } from 'react'
import { reportsService } from '../../services'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '../../utils/helpers'
import { BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MonthlyReportPage = () => {
  const [data, setData] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    reportsService.getMonthlyUsage(year)
      .then(({ data: d }) => setData(d.data || []))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false))
  }, [year])

  const totalPurchases = data.reduce((s, d) => s + d.purchaseAmount, 0)
  const totalIssues = data.reduce((s, d) => s + d.issueCount, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={24} /> Monthly Usage Report</h1>
          <p className="page-subtitle">Purchase and consumption trends by month</p>
        </div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input w-28">
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5"><p className="text-sm text-gray-500">Total Purchases ({year})</p><p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalPurchases)}</p></div>
        <div className="card p-5"><p className="text-sm text-gray-500">Total Issues ({year})</p><p className="text-2xl font-bold text-green-700 mt-1">{totalIssues}</p></div>
      </div>

      <div className="card mb-6">
        <div className="card-header"><h3 className="font-semibold text-gray-800">Monthly Purchase Amounts</h3></div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monthName" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(0, 3)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Purchases']} />
              <Bar dataKey="purchaseAmount" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-800">Monthly Breakdown</h3></div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead><tr><th>Month</th><th>Purchase Amount</th><th>Purchase Orders</th><th>Material Issues</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">Loading...</td></tr>
              ) : data.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="font-medium">{row.monthName}</td>
                  <td className="font-semibold">{formatCurrency(row.purchaseAmount)}</td>
                  <td><span className="badge-blue">{row.purchaseCount}</span></td>
                  <td><span className="badge-green">{row.issueCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MonthlyReportPage
