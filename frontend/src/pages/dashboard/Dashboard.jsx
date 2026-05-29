import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import { reportsService } from '../../services'
import StatCard from '../../components/ui/StatCard'
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/helpers'
import {
  Package, DollarSign, AlertTriangle, ShoppingCart,
  TrendingUp, Building2, Clock, ArrowRight, Warehouse
} from 'lucide-react'

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsService.getDashboard()
      .then(({ data }) => setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const chartData = stats?.purchaseChartData || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Construction Inventory Overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link to="/purchases/new" className="btn-primary">
          <ShoppingCart size={16} /> New Purchase
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Materials"
          value={stats?.totalMaterials || 0}
          subtitle="Registered items"
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Monthly Purchases"
          value={formatCurrency(stats?.monthlyPurchaseAmount)}
          subtitle={`${stats?.monthlyPurchaseCount || 0} orders this month`}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats?.lowStockCount || 0}
          subtitle="Items below minimum"
          icon={AlertTriangle}
          color={stats?.lowStockCount > 0 ? 'red' : 'green'}
          onClick={() => window.location.href = '/reports/low-stock'}
        />
        <StatCard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          subtitle={`${stats?.totalSuppliers || 0} suppliers registered`}
          icon={Building2}
          color="purple"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Issues"
          value={stats?.pendingIssues || 0}
          subtitle="Awaiting approval"
          icon={Clock}
          color="amber"
          onClick={() => window.location.href = '/issues'}
        />
        <StatCard
          title="Yearly Purchases"
          value={formatCurrency(stats?.yearlyPurchaseAmount)}
          subtitle={`${new Date().getFullYear()} total`}
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="Warehouses"
          value={stats?.activeProjects || 0}
          subtitle="Project sites active"
          icon={Warehouse}
          color="blue"
        />
        <StatCard
          title="Out of Stock"
          value={stats?.outOfStockCount || 0}
          subtitle="Zero stock items"
          icon={AlertTriangle}
          color={stats?.outOfStockCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Trend */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-gray-800">Monthly Purchase Trend</h3>
              <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Purchases']} />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts */}
        <div className="card flex flex-col">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Quick Stats</h3>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[
              { label: 'Active Projects', value: stats?.activeProjects, color: 'bg-blue-500' },
              { label: 'Total Suppliers', value: stats?.totalSuppliers, color: 'bg-green-500' },
              { label: 'Pending Approvals', value: stats?.pendingIssues, color: 'bg-amber-500' },
              { label: 'Low Stock Items', value: stats?.lowStockCount, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
                <span className="font-bold text-gray-900">{value || 0}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100">
            <Link to="/reports/low-stock" className="btn-secondary w-full justify-center text-xs">
              View Low Stock Report <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-800">Recent Purchases</h3>
          <Link to="/purchases" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Supplier</th>
                <th>Project</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {stats?.recentPurchases?.length > 0 ? (
                stats.recentPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td><Link to={`/purchases/${p.id}`} className="text-blue-600 hover:underline font-medium">{p.billNo}</Link></td>
                    <td>{p.supplier?.supplierName || '—'}</td>
                    <td>{p.project?.projectName || '—'}</td>
                    <td>{formatDate(p.purchaseDate)}</td>
                    <td className="font-semibold">{formatCurrency(p.totalAmount)}</td>
                    <td><span className={getStatusBadge(p.status)}>{p.status}</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">No recent purchases</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {stats?.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">{stats.lowStockCount} material(s) are running low</p>
              <p className="text-sm text-amber-600">Immediate restocking recommended to avoid project delays</p>
            </div>
          </div>
          <Link to="/reports/low-stock" className="btn-warning btn-sm shrink-0">View Report</Link>
        </div>
      )}
    </div>
  )
}

export default Dashboard
