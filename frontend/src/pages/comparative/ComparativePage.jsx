import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { comparativeService } from '../../services'
import { formatDate } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { BarChart2, Plus, Eye, CheckCircle, ThumbsUp } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  DRAFT:          'badge badge-gray',
  HOD_RECOMMENDED:'badge badge-blue',
  USER_VERIFIED:  'badge badge-yellow',
  FINAL_VERIFIED: 'badge badge-green',
}

const STATUS_LABEL = {
  DRAFT: 'Draft', HOD_RECOMMENDED: 'HOD Recommended',
  USER_VERIFIED: 'User Verified', FINAL_VERIFIED: 'Final Verified',
}

const ComparativePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comparatives, setComparatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'].includes(user?.role)
  const isUserHOD     = ['USER_HOD', 'ADMIN'].includes(user?.role)
  const isPresident   = ['PRESIDENT_PROJECTS', 'ADMIN'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await comparativeService.getAll({ limit: 100 })
      setComparatives(data.data || [])
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const doAction = async (fn, msg) => {
    try { await fn(); toast.success(msg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActionLoading(null) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={22} /> Comparative Statements</h1>
          <p className="page-subtitle">Quotation comparison before PO finalisation</p>
        </div>
        {isPurchaseHOD && (
          <button onClick={() => navigate('/comparative/new')} className="btn-primary">
            <Plus size={16} /> New CS
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : comparatives.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BarChart2 size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No Comparative Statements yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>CS #</th>
                  <th>Indent</th>
                  <th>Quotations</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {comparatives.map((cs) => (
                  <tr key={cs.id}>
                    <td><span className="font-mono text-primary-700 font-semibold text-sm">{cs.csNumber}</span></td>
                    <td>
                      <Link to={`/indents/${cs.indentId}`} className="text-primary-700 hover:underline text-sm">
                        {cs.indent?.indentNumber}
                      </Link>
                      <p className="text-xs text-gray-400">{cs.indent?.department}</p>
                    </td>
                    <td><span className="badge badge-gray">{cs.quotations?.length} supplier{cs.quotations?.length !== 1 ? 's' : ''}</span></td>
                    <td>{cs.createdBy?.name}</td>
                    <td>{formatDate(cs.createdAt)}</td>
                    <td><span className={STATUS_BADGE[cs.status] || 'badge badge-gray'}>{STATUS_LABEL[cs.status] || cs.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/comparative/${cs.id}`} className="p-1.5 rounded text-gray-500 hover:text-primary-700 hover:bg-primary-50" title="View">
                          <Eye size={14} />
                        </Link>
                        {isPurchaseHOD && cs.status === 'DRAFT' && (
                          <button
                            onClick={() => { setActionLoading(cs.id); doAction(() => comparativeService.hodRecommend(cs.id, ''), 'CS recommended') }}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="HOD Recommend"
                          ><ThumbsUp size={14} /></button>
                        )}
                        {isUserHOD && cs.status === 'HOD_RECOMMENDED' && (
                          <button
                            onClick={() => { setActionLoading(cs.id); doAction(() => comparativeService.userVerify(cs.id), 'User verified') }}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-green-600 hover:bg-green-50" title="User Verify"
                          ><CheckCircle size={14} /></button>
                        )}
                        {isPresident && cs.status === 'USER_VERIFIED' && (
                          <button
                            onClick={() => { setActionLoading(cs.id); doAction(() => comparativeService.presidentVerify(cs.id), 'CS finally verified') }}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-purple-600 hover:bg-purple-50" title="Final Verify"
                          ><CheckCircle size={14} /></button>
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

export default ComparativePage
