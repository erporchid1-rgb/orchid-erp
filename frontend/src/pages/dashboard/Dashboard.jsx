import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { reportsService } from '../../services'
import StatCard from '../../components/ui/StatCard'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import {
  Package, DollarSign, AlertTriangle, ShoppingCart,
  TrendingUp, Building2, Clock, ArrowRight, Warehouse,
  Bell, X, CheckCircle, ClipboardList, BarChart2, FileCheck, Truck,
  ChevronRight,
} from 'lucide-react'

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const ROLE_LABEL = {
  ADMIN:             'System Admin',
  MD:                'Managing Director',
  EXE_DIRECTOR:      'Executive Director',
  PRESIDENT_PROJECTS:'President — Projects',
  CFO:               'Chief Financial Officer',
  GM_PURCHASE:       'Dy. Manager — Purchase',
  PURCHASE_HOD:      'HOD — Purchase',
  USER_HOD:          'User HOD',
  INCHARGE:          'Site Incharge',
  STORE_MANAGER:     'Store Manager',
  FINANCE:           'Finance',
  ACCOUNTANT:        'Accountant',
  SITE_ENGINEER:     'Site Engineer',
}

const ROLE_COLOR = {
  ADMIN:             'bg-gray-900 text-white',
  MD:                'bg-purple-700 text-white',
  EXE_DIRECTOR:      'bg-purple-600 text-white',
  PRESIDENT_PROJECTS:'bg-indigo-700 text-white',
  CFO:               'bg-blue-700 text-white',
  GM_PURCHASE:       'bg-blue-600 text-white',
  PURCHASE_HOD:      'bg-sky-600 text-white',
  USER_HOD:          'bg-teal-600 text-white',
  INCHARGE:          'bg-orange-600 text-white',
  STORE_MANAGER:     'bg-green-700 text-white',
  FINANCE:           'bg-emerald-600 text-white',
  ACCOUNTANT:        'bg-emerald-500 text-white',
  SITE_ENGINEER:     'bg-yellow-600 text-white',
}

const GREETING = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const TYPE_ICON = {
  indent: ClipboardList,
  cs:     BarChart2,
  nfa:    FileCheck,
  mrn:    Truck,
}
const TYPE_COLOR = {
  indent: { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: 'text-blue-600',  badge: 'bg-blue-600' },
  cs:     { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-600' },
  nfa:    { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', badge: 'bg-indigo-600' },
  mrn:    { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badge: 'bg-green-600' },
}

// ─── Pending Popup ────────────────────────────────────────────────────────────
const PendingPopup = ({ pending, onClose }) => {
  const navigate = useNavigate()
  if (!pending || pending.total === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-900 to-primary-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Bell size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Pending Actions</p>
              <p className="text-red-100 text-sm">{pending.total} item{pending.total !== 1 ? 's' : ''} require your attention</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pending.groups.map((group) => {
            const colors = TYPE_COLOR[group.type] || TYPE_COLOR.indent
            const Icon   = TYPE_ICON[group.type]  || Bell
            return (
              <div key={group.action} className={`rounded-xl border-2 ${colors.border} overflow-hidden bg-white`}>
                {/* Group header */}
                <div className={`px-4 py-3 flex items-center justify-between ${colors.bg}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={colors.icon} />
                    <span className="font-semibold text-gray-800 text-sm">{group.action}</span>
                  </div>
                  <span className={`text-xs text-white px-2 py-0.5 rounded-full font-bold ${colors.badge}`}>
                    {group.items.length}
                  </span>
                </div>
                {/* Items */}
                <div className="border-t border-gray-200 divide-y divide-gray-100 bg-white">
                  {group.items.slice(0, 4).map((item) => (
                    <button key={item.id} onClick={() => { navigate(item.path); onClose() }}
                      className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-blue-50 transition-colors text-left">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 font-mono">{item.label}</p>
                        {item.sub && <p className="text-xs text-gray-500">{item.sub}</p>}
                      </div>
                      <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    </button>
                  ))}
                  {group.items.length > 4 && (
                    <button onClick={() => { navigate(group.path); onClose() }}
                      className="w-full px-4 py-2 text-xs text-center font-medium text-gray-600 hover:bg-white/50 transition-colors">
                      +{group.items.length - 4} more — View all
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
            OK, I'll handle these
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pending summary card ─────────────────────────────────────────────────────
const PendingSummaryCard = ({ pending, onOpen }) => {
  if (!pending || pending.total === 0) return (
    <div className="card p-4 flex items-center gap-4 border-l-4 border-green-400">
      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
        <CheckCircle size={20} className="text-green-600" />
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">All Clear!</p>
        <p className="text-xs text-gray-500">No pending approvals for you</p>
      </div>
    </div>
  )

  return (
    <button onClick={onOpen}
      className="card p-4 flex items-center justify-between gap-4 border-l-4 border-primary-600 w-full text-left hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center relative">
          <Bell size={20} className="text-primary-600" />
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pending.total > 9 ? '9+' : pending.total}
          </span>
        </div>
        <div>
          <p className="font-bold text-primary-700 text-sm">{pending.total} Pending Action{pending.total !== 1 ? 's' : ''}</p>
          <p className="text-xs text-gray-500">{pending.groups.map(g => g.action).join(' · ')}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 shrink-0" />
    </button>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats]       = useState(null)
  const [pending, setPending]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    Promise.all([
      reportsService.getDashboard(),
      reportsService.getMyPending(),
    ])
      .then(([statsRes, pendingRes]) => {
        setStats(statsRes.data.data)
        const p = pendingRes.data.data
        setPending(p)
        // Show popup once per session if there are pending items
        const key = `popup_shown_${user?.id}`
        if (p?.total > 0 && !sessionStorage.getItem(key)) {
          setShowPopup(true)
          sessionStorage.setItem(key, '1')
        }
      })
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
    <>
      {showPopup && <PendingPopup pending={pending} onClose={() => setShowPopup(false)} />}

      <div className="space-y-6">

        {/* ── Personalized Header ── */}
        <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-primary-200 text-sm font-medium">{GREETING()},</p>
            <h1 className="text-white font-bold text-2xl leading-tight mt-0.5">{user?.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ROLE_COLOR[user?.role] || 'bg-gray-700 text-white'}`}>
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
              <span className="text-primary-300 text-xs">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-primary-200 text-xs">Orchid Infrastructure Developers</p>
            <p className="text-primary-300 text-xs">Construction ERP System</p>
          </div>
        </div>

        {/* ── Pending Alert ── */}
        <PendingSummaryCard pending={pending} onOpen={() => setShowPopup(true)} />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Materials" value={stats?.totalMaterials || 0} subtitle="Registered items" icon={Package} color="blue" />
          <StatCard title="Monthly Purchases" value={formatCurrency(stats?.monthlyPurchaseAmount)} subtitle={`${stats?.monthlyPurchaseCount || 0} orders this month`} icon={ShoppingCart} color="green" />
          <StatCard title="Low Stock Alerts" value={stats?.lowStockCount || 0} subtitle="Items below minimum" icon={AlertTriangle} color={stats?.lowStockCount > 0 ? 'red' : 'green'} onClick={() => window.location.href = '/reports/low-stock'} />
          <StatCard title="Active Projects" value={stats?.activeProjects || 0} subtitle={`${stats?.totalSuppliers || 0} suppliers`} icon={Building2} color="purple" />
        </div>

        {/* ── Pending action cards by group ── */}
        {pending?.total > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Bell size={15} className="text-red-500" /> Your Pending Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pending.groups.map((group) => {
                const colors = TYPE_COLOR[group.type] || TYPE_COLOR.indent
                const Icon   = TYPE_ICON[group.type]  || Bell
                return (
                  <Link key={group.action} to={group.path}
                    className={`card p-4 border-2 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0`}>
                      <Icon size={20} className={colors.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{group.action}</p>
                      <p className="text-xs text-gray-500">{group.items.length} item{group.items.length !== 1 ? 's' : ''} waiting</p>
                    </div>
                    <span className={`text-white text-sm font-bold px-2.5 py-1 rounded-full shrink-0 ${colors.badge}`}>
                      {group.items.length}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-gray-800">Monthly Purchase Trend</h3>
                <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
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

          <div className="card flex flex-col">
            <div className="card-header">
              <h3 className="font-semibold text-gray-800">Quick Stats</h3>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {[
                { label: 'Active Projects',   value: stats?.activeProjects,   color: 'bg-blue-500' },
                { label: 'Total Suppliers',   value: stats?.totalSuppliers,   color: 'bg-green-500' },
                { label: 'Pending Issues',    value: stats?.pendingIssues,    color: 'bg-amber-500' },
                { label: 'Low Stock Items',   value: stats?.lowStockCount,    color: 'bg-red-500' },
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

        {/* ── Recent Purchases ── */}
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
                  <th>Bill No</th><th>Supplier</th><th>Project</th><th>Date</th><th>Amount</th><th>Status</th>
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
                      <td><span className="badge badge-gray">{p.status}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">No recent purchases</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Banner */}
        {stats?.lowStockCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-800">{stats.lowStockCount} material(s) are running low</p>
                <p className="text-sm text-amber-600">Immediate restocking recommended</p>
              </div>
            </div>
            <Link to="/reports/low-stock" className="btn-warning btn-sm shrink-0">View Report</Link>
          </div>
        )}

      </div>
    </>
  )
}

export default Dashboard
