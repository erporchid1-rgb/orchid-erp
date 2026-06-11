import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, FolderKanban, MapPin, Package, Users, ShoppingCart,
  Warehouse, TruckIcon, BarChart2, Bell, Settings,
  ClipboardList, ChevronDown, ChevronRight, X, FileCheck, Scale, Truck
} from 'lucide-react'
import { useState } from 'react'
import { cn as clsx } from '../../utils/cn'

const PURCHASE_ROLES = ['ADMIN', 'PURCHASE_HOD', 'GM_PURCHASE', 'STORE_MANAGER', 'ACCOUNTANT', 'FINANCE']
const SENIOR_ROLES   = ['ADMIN', 'MD', 'EXE_DIRECTOR', 'PRESIDENT_PROJECTS', 'CFO', 'GM_PURCHASE',
                         'PURCHASE_HOD', 'USER_HOD', 'FINANCE']

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects',  icon: FolderKanban,    label: 'Projects' },
  { path: '/sites',     icon: MapPin,           label: 'Sites / Blocks' },
  { path: '/materials', icon: Package,          label: 'Material Master' },
  { path: '/suppliers', icon: TruckIcon,        label: 'Suppliers' },
  // ─── Procurement Workflow ─────────────────────────────────────────────────
  { path: '/indents',      icon: ClipboardList, label: 'Indent / Requisition' },
  { path: '/comparative',  icon: Scale,         label: 'Comparative Statement', roles: PURCHASE_ROLES },
  { path: '/nfa',          icon: FileCheck,     label: 'NFA — Note for Approval', roles: SENIOR_ROLES },
  { path: '/purchases',    icon: ShoppingCart,  label: 'Purchase Orders', roles: PURCHASE_ROLES },
  { path: '/mrn',          icon: Truck,         label: 'MRN — Receiving Note', roles: [...PURCHASE_ROLES, 'INCHARGE', 'SITE_ENGINEER'] },
  // ─── Inventory ────────────────────────────────────────────────────────────
  {
    label: 'Inventory',
    icon: Warehouse,
    children: [
      { path: '/stock',     label: 'Current Stock' },
      { path: '/issues',    label: 'Material Issues' },
      { path: '/transfers', label: 'Stock Transfers' },
    ],
  },
  // ─── Reports ─────────────────────────────────────────────────────────────
  {
    label: 'Reports',
    icon: BarChart2,
    children: [
      { path: '/reports/stock',       label: 'Stock Report' },
      { path: '/reports/purchases',   label: 'Purchase Report' },
      { path: '/reports/consumption', label: 'Consumption' },
      { path: '/reports/low-stock',   label: 'Low Stock' },
      { path: '/reports/monthly',     label: 'Monthly Usage' },
    ],
  },
  { path: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
]

const NavItem = ({ item, isCollapsed }) => {
  const { user } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(() =>
    item.children?.some((c) => location.pathname.startsWith(c.path))
  )

  if (item.roles && !item.roles.includes(user?.role)) return null

  if (item.children) {
    const isActive = item.children.some((c) => location.pathname.startsWith(c.path))
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isActive ? 'bg-primary-700 text-white' : 'text-primary-100 hover:bg-primary-700/50 hover:text-white'
          )}
        >
          <item.icon size={18} className="shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          )}
        </button>
        {isOpen && !isCollapsed && (
          <div className="mt-1 ml-6 space-y-0.5 border-l border-primary-700 pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  clsx('block px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    isActive ? 'bg-primary-600 text-white' : 'text-primary-200 hover:text-white hover:bg-primary-700/50')
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      title={isCollapsed ? item.label : undefined}
      className={({ isActive }) =>
        clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-primary-100 hover:bg-primary-700/50 hover:text-white',
          isCollapsed && 'justify-center')
      }
    >
      <item.icon size={18} className="shrink-0" />
      {!isCollapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

const Sidebar = ({ collapsed, onClose }) => {
  return (
    <aside className={clsx(
      'flex flex-col bg-gradient-to-b from-primary-900 to-primary-950 h-full transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-800">
        <div className="w-11 h-11 rounded-xl shrink-0 bg-white shadow-md border border-white/20 flex items-center justify-center p-1">
          <img src="/logo.png" alt="Orchid" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">Orchid Construction</p>
            <p className="text-[#c8971f] text-xs font-medium">ERP System</p>
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto text-primary-300 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item, idx) => (
          <NavItem key={item.path || idx} item={item} isCollapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-primary-800 space-y-0.5">
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-primary-600 text-white' : 'text-primary-100 hover:bg-primary-700/50 hover:text-white',
              collapsed && 'justify-center')
          }
        >
          <Bell size={18} />
          {!collapsed && <span>Notifications</span>}
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-primary-600 text-white' : 'text-primary-100 hover:bg-primary-700/50 hover:text-white',
              collapsed && 'justify-center')
          }
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  )
}

export default Sidebar
