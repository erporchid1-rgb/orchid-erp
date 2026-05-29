import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { indentsService } from '../../services'
import { formatDate } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, ClipboardList, CheckCircle, XCircle, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  PENDING: 'badge badge-yellow',
  APPROVED: 'badge badge-green',
  REJECTED: 'badge badge-red',
  PO_CREATED: 'badge badge-blue',
}

const IndentDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [indent, setIndent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const canApprove = ['ADMIN', 'STORE_MANAGER'].includes(user?.role)

  const load = () => {
    indentsService.getById(id)
      .then(({ data }) => setIndent(data.data))
      .catch(() => { toast.error('Indent not found'); navigate('/indents') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleApprove = async () => {
    setActing(true)
    try {
      await indentsService.approve(id)
      toast.success('Indent approved')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActing(false) }
  }

  const handleReject = async () => {
    const notes = window.prompt('Reason for rejection:')
    if (notes === null) return
    setActing(true)
    try {
      await indentsService.reject(id, notes)
      toast.success('Indent rejected')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActing(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  if (!indent) return null

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex-1">
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList size={22} />
            Indent — <span className="font-mono text-primary-700">{indent.indentNumber}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && indent.status === 'PENDING' && (
            <>
              <button onClick={handleApprove} disabled={acting} className="btn-success btn-sm">
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={handleReject} disabled={acting} className="btn-danger btn-sm">
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          {indent.status === 'APPROVED' && canApprove && (
            <Link to={`/purchases/new?indentId=${indent.id}`} className="btn btn-primary btn-sm">
              <ShoppingCart size={14} /> Create Purchase Order
            </Link>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { label: 'Status', value: <span className={STATUS_BADGE[indent.status]}>{indent.status.replace('_', ' ')}</span> },
              { label: 'Requested By', value: indent.requestedBy?.name },
              { label: 'Required By', value: formatDate(indent.requiredDate) },
              { label: 'Project', value: indent.project?.projectName || '—' },
              { label: 'Site / Block', value: indent.site?.siteName || '—' },
              { label: 'Raised On', value: formatDate(indent.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <div className="font-semibold text-gray-800">{value}</div>
              </div>
            ))}
          </div>
          {indent.purpose && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Purpose / Work Description</p>
              <p className="text-gray-800">{indent.purpose}</p>
            </div>
          )}
          {indent.remarks && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Remarks</p>
              <p className="text-gray-600 text-sm">{indent.remarks}</p>
            </div>
          )}
          {indent.approvalNotes && (
            <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Approval Notes (by {indent.approvedBy?.name})</p>
              <p className="text-gray-700 text-sm">{indent.approvalNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card mb-4">
        <div className="card-header"><h3 className="font-semibold text-gray-800">Materials Requested</h3></div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Material</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Qty Requested</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {indent.items?.map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td className="font-medium">{item.material?.materialName}</td>
                  <td>{item.material?.category?.name}</td>
                  <td>{item.unit}</td>
                  <td className="font-semibold">{item.requestedQty}</td>
                  <td className="text-gray-500">{item.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked POs */}
      {indent.purchases?.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Linked Purchase Orders</h3></div>
          <div className="card-body space-y-2">
            {indent.purchases.map((po) => (
              <Link key={po.id} to={`/purchases/${po.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors">
                <span className="font-mono text-primary-700 font-semibold">{po.billNo}</span>
                <span className="badge badge-blue">{po.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default IndentDetailPage
