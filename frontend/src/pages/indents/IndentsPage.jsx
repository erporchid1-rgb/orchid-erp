import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { indentsService } from '../../services'
import { formatDate } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { ClipboardList, Plus, Eye, Send, CheckCircle, XCircle, PauseCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  DRAFT:              'badge badge-gray',
  HOD_PENDING:        'badge badge-yellow',
  HOD_APPROVED:       'badge badge-blue',
  HOD_REJECTED:       'badge badge-red',
  HOD_HOLD:           'badge badge-orange',
  PURCHASE_PENDING:   'badge badge-yellow',
  PURCHASE_ACCEPTED:  'badge badge-blue',
  PURCHASE_RETURNED:  'badge badge-orange',
  PURCHASE_HOLD:      'badge badge-orange',
  COMPARATIVE:        'badge badge-purple',
  NFA:                'badge badge-purple',
  NFA_APPROVED:       'badge badge-green',
  PO_CREATED:         'badge badge-green',
  CLOSED:             'badge badge-gray',
}

const STATUS_LABELS = {
  DRAFT:              'Draft',
  HOD_PENDING:        'HOD Review',
  HOD_APPROVED:       'HOD Approved',
  HOD_REJECTED:       'HOD Rejected',
  HOD_HOLD:           'HOD Hold',
  PURCHASE_PENDING:   'Purchase Review',
  PURCHASE_ACCEPTED:  'Purchase Accepted',
  PURCHASE_RETURNED:  'Returned',
  PURCHASE_HOLD:      'Purchase Hold',
  COMPARATIVE:        'Comparative',
  NFA:                'NFA',
  NFA_APPROVED:       'NFA Approved',
  PO_CREATED:         'PO Created',
  CLOSED:             'Closed',
}

const ALL_STATUSES = Object.keys(STATUS_LABELS)

const IndentsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [indents, setIndents] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const isStoreCrew  = ['STORE_MANAGER', 'INCHARGE', 'SITE_ENGINEER'].includes(user?.role)
  const isHOD        = ['USER_HOD', 'ADMIN'].includes(user?.role)
  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await indentsService.getAll({ status: statusFilter || undefined, limit: 200 })
      setIndents(data.data || [])
    } catch { toast.error('Failed to load indents') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const doAction = async (fn, successMsg) => {
    try { await fn(); toast.success(successMsg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActionLoading(null) }
  }

  const handleSubmit = async (id) => {
    setActionLoading(id + '_submit')
    await doAction(() => indentsService.submitToHOD(id), 'Indent submitted to HOD')
  }

  const handleHOD = async (id, action) => {
    const notes = action !== 'approve' ? window.prompt(`Reason (${action}):`) : ''
    if (notes === null) return
    setActionLoading(id + '_hod')
    await doAction(() => indentsService.hodAction(id, action, notes || ''), `Indent ${action}d`)
  }

  const handlePurchase = async (id, action) => {
    const notes = action !== 'accept' ? window.prompt(`Notes / Reason (${action}):`) : ''
    if (notes === null) return
    setActionLoading(id + '_purchase')
    await doAction(() => indentsService.purchaseAction(id, action, notes || ''), `Indent ${action}ed`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList size={22} /> Material Indents / Requisitions</h1>
          <p className="page-subtitle">Full procurement requisition workflow</p>
        </div>
        {(isStoreCrew || user?.role === 'ADMIN') && (
          <button onClick={() => navigate('/indents/new')} className="btn-primary">
            <Plus size={16} /> Raise Indent
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            statusFilter === '' ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
            }`}
          >
            {STATUS_LABELS[s]}
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
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Indent #</th>
                  <th>Dept / Category</th>
                  <th>Project / Site</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Items</th>
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
                      <p className="font-medium text-gray-800">{indent.department || '—'}</p>
                      <p className="text-xs text-gray-400">{indent.category || ''}</p>
                    </td>
                    <td>
                      <p className="font-medium text-gray-800">{indent.project?.projectName || '—'}</p>
                      <p className="text-xs text-gray-500">{indent.site?.siteName || ''}</p>
                    </td>
                    <td>
                      <p className="font-medium">{indent.requestedBy?.name}</p>
                      <p className="text-xs text-gray-400">{indent.requestedBy?.role?.replace(/_/g, ' ')}</p>
                    </td>
                    <td>{formatDate(indent.createdAt)}</td>
                    <td>
                      <span className="badge badge-gray">{indent.items?.length}</span>
                    </td>
                    <td>
                      <span className={STATUS_BADGE[indent.status] || 'badge badge-gray'}>
                        {STATUS_LABELS[indent.status] || indent.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Link to={`/indents/${indent.id}`} className="p-1.5 rounded text-gray-500 hover:text-primary-700 hover:bg-primary-50" title="View">
                          <Eye size={14} />
                        </Link>

                        {/* Store submits to HOD */}
                        {indent.status === 'DRAFT' && indent.requestedById === user?.id && (
                          <button
                            onClick={() => handleSubmit(indent.id)}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Submit to HOD"
                          >
                            <Send size={14} />
                          </button>
                        )}

                        {/* HOD actions */}
                        {isHOD && indent.status === 'HOD_PENDING' && (
                          <>
                            <button onClick={() => handleHOD(indent.id, 'approve')} disabled={!!actionLoading}
                              className="p-1.5 rounded text-green-600 hover:bg-green-50" title="Approve">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleHOD(indent.id, 'reject')} disabled={!!actionLoading}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50" title="Reject">
                              <XCircle size={14} />
                            </button>
                            <button onClick={() => handleHOD(indent.id, 'hold')} disabled={!!actionLoading}
                              className="p-1.5 rounded text-orange-500 hover:bg-orange-50" title="Hold">
                              <PauseCircle size={14} />
                            </button>
                          </>
                        )}

                        {/* Purchase HOD actions */}
                        {isPurchaseHOD && indent.status === 'PURCHASE_PENDING' && (
                          <>
                            <button onClick={() => handlePurchase(indent.id, 'accept')} disabled={!!actionLoading}
                              className="p-1.5 rounded text-green-600 hover:bg-green-50" title="Accept">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handlePurchase(indent.id, 'return')} disabled={!!actionLoading}
                              className="p-1.5 rounded text-orange-500 hover:bg-orange-50" title="Return">
                              <XCircle size={14} />
                            </button>
                            <button onClick={() => handlePurchase(indent.id, 'hold')} disabled={!!actionLoading}
                              className="p-1.5 rounded text-gray-500 hover:bg-gray-50" title="Hold">
                              <PauseCircle size={14} />
                            </button>
                          </>
                        )}

                        {/* Create Comparative */}
                        {isPurchaseHOD && indent.status === 'PURCHASE_ACCEPTED' && (
                          <Link
                            to={`/comparative/new?indentId=${indent.id}`}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            CS
                          </Link>
                        )}

                        {/* Create NFA */}
                        {isPurchaseHOD && ['NFA', 'PURCHASE_ACCEPTED', 'COMPARATIVE'].includes(indent.status) && (
                          <Link
                            to={`/nfa/new?indentId=${indent.id}`}
                            className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                          >
                            NFA
                          </Link>
                        )}

                        {/* Create PO */}
                        {isPurchaseHOD && indent.status === 'NFA_APPROVED' && (
                          <Link
                            to={`/purchases/new?indentId=${indent.id}`}
                            className="text-xs px-2 py-1 bg-primary-700 text-white rounded hover:bg-primary-800"
                          >
                            PO
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
