import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { indentsService } from '../../services'
import { formatDate } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { ClipboardList, Plus, CheckCircle, XCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  PENDING: 'badge badge-yellow',
  APPROVED: 'badge badge-green',
  REJECTED: 'badge badge-red',
  PO_CREATED: 'badge badge-blue',
}

const IndentsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [indents, setIndents] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const canApprove = ['ADMIN', 'STORE_MANAGER'].includes(user?.role)
  const canCreate = true // all roles can raise indents

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await indentsService.getAll({ status: statusFilter || undefined, limit: 100 })
      setIndents(data.data || [])
    } catch { toast.error('Failed to load indents') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const handleApprove = async (id) => {
    setActionLoading(id + '_approve')
    try {
      await indentsService.approve(id)
      toast.success('Indent approved')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActionLoading(null) }
  }

  const handleReject = async (id) => {
    const notes = window.prompt('Reason for rejection (optional):')
    if (notes === null) return // cancelled
    setActionLoading(id + '_reject')
    try {
      await indentsService.reject(id, notes)
      toast.success('Indent rejected')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActionLoading(null) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList size={22} /> Material Indents</h1>
          <p className="page-subtitle">Requisitions raised by site incharges for material procurement</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/indents/new')} className="btn-primary">
            <Plus size={16} /> Raise Indent
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'PO_CREATED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-primary-700 text-white border-primary-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-700'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : indents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No indents found</p>
            <p className="text-sm mt-1">Click "Raise Indent" to create a material requisition</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Indent #</th>
                  <th>Project / Site</th>
                  <th>Requested By</th>
                  <th>Required Date</th>
                  <th>Items</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {indents.map((indent) => (
                  <tr key={indent.id}>
                    <td>
                      <span className="font-mono text-primary-700 font-semibold text-sm">{indent.indentNumber}</span>
                    </td>
                    <td>
                      <p className="font-medium text-gray-800">{indent.project?.projectName || '—'}</p>
                      <p className="text-xs text-gray-500">{indent.site?.siteName || ''}</p>
                    </td>
                    <td>
                      <p className="font-medium">{indent.requestedBy?.name}</p>
                      <p className="text-xs text-gray-400">{indent.requestedBy?.role?.replace('_', ' ')}</p>
                    </td>
                    <td>{formatDate(indent.requiredDate)}</td>
                    <td>
                      <span className="badge badge-gray">{indent.items?.length} item{indent.items?.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="max-w-xs truncate text-gray-600">{indent.purpose || '—'}</td>
                    <td>
                      <span className={STATUS_BADGE[indent.status] || 'badge badge-gray'}>{indent.status}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/indents/${indent.id}`} className="p-1.5 rounded text-gray-500 hover:text-primary-700 hover:bg-primary-50" title="View">
                          <Eye size={14} />
                        </Link>
                        {canApprove && indent.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(indent.id)}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded text-green-600 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              onClick={() => handleReject(indent.id)}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {indent.status === 'APPROVED' && canApprove && (
                          <Link
                            to={`/purchases/new?indentId=${indent.id}`}
                            className="text-xs px-2 py-1 bg-primary-700 text-white rounded hover:bg-primary-800"
                          >
                            Create PO
                          </Link>
                        )}
                        {indent.purchases?.length > 0 && (
                          <Link to={`/purchases/${indent.purchases[0].id}`} className="text-xs text-blue-600 hover:underline">
                            PO: {indent.purchases[0].billNo}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default IndentsPage
