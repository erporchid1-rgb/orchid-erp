import { useState, useEffect } from 'react'
import { notificationsService } from '../../services'
import { Bell, CheckCheck, AlertTriangle, ShoppingCart, Package } from 'lucide-react'
import { formatDateTime } from '../../utils/helpers'
import toast from 'react-hot-toast'

const TYPE_ICONS = {
  LOW_STOCK: AlertTriangle,
  PURCHASE_CREATED: ShoppingCart,
  ISSUE_APPROVED: Package,
  TRANSFER_COMPLETED: Package,
  SYSTEM: Bell,
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await notificationsService.getAll({ limit: 50 })
      setNotifications(res.data.data || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const markAllRead = async () => {
    try {
      await notificationsService.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch {}
  }

  const markRead = async (id) => {
    try {
      await notificationsService.markRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {}
  }

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Bell size={24} /> Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary btn-sm"><CheckCheck size={14} /> Mark all read</button>
        )}
      </div>

      <div className="card divide-y divide-gray-100">
        {loading ? (
          <div className="py-12 text-center text-gray-500 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : notifications.map((n) => {
          const Icon = TYPE_ICONS[n.type] || Bell
          return (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.type === 'LOW_STOCK' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                <Icon size={16} className={n.type === 'LOW_STOCK' ? 'text-amber-600' : 'text-blue-600'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default NotificationsPage
