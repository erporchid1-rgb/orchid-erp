import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { nfaService } from '../../services'
import { formatDate, formatCurrency } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { FileCheck, Plus, Eye, PenLine, CheckCircle, XCircle, PauseCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  DRAFT:             'badge badge-gray',
  GM_SIGNED:         'badge badge-blue',
  USER_SIGNED:       'badge badge-blue',
  CFO_SIGNED:        'badge badge-blue',
  PRESIDENT_SIGNED:  'badge badge-blue',
  DIR_SIGNED:        'badge badge-yellow',
  MD_APPROVED:       'badge badge-green',
  MD_REJECTED:       'badge badge-red',
  MD_HOLD:           'badge badge-orange',
}

const STATUS_LABEL = {
  DRAFT: 'Draft', GM_SIGNED: 'GM Signed', USER_SIGNED: 'User Dept Signed',
  CFO_SIGNED: 'CFO Signed', PRESIDENT_SIGNED: 'President Signed',
  DIR_SIGNED: 'Exe. Director Signed', MD_APPROVED: 'MD Approved',
  MD_REJECTED: 'MD Rejected', MD_HOLD: 'MD Hold',
}

const NFAPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [nfas, setNFAs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'].includes(user?.role)
  const isMD          = ['MD', 'ADMIN'].includes(user?.role)

  // PURCHASE_HOD (Gagan) is first signatory; GM_PURCHASE (Sumit) creates/submits only
  const signAction = {
    PURCHASE_HOD:       'gm_sign',
    USER_HOD:           'user_sign',
    CFO:                'cfo_sign',
    PRESIDENT_PROJECTS: 'president_sign',
    EXE_DIRECTOR:       'dir_sign',
  }[user?.role]

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await nfaService.getAll({ limit: 100 })
      setNFAs(data.data || [])
    } catch { toast.error('Failed to load NFAs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const doAction = async (fn, msg) => {
    try { await fn(); toast.success(msg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActionLoading(null) }
  }

  const canSign = (nfa) => {
    if (!signAction) return false
    const needsMap = {
      gm_sign: 'DRAFT', user_sign: 'GM_SIGNED', cfo_sign: 'USER_SIGNED',
      president_sign: 'CFO_SIGNED', dir_sign: 'PRESIDENT_SIGNED',
    }
    return nfa.status === needsMap[signAction]
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><FileCheck size={22} /> Note for Approval (NFA)</h1>
          <p className="page-subtitle">Multi-signatory approval before Purchase Order</p>
        </div>
        {isPurchaseHOD && (
          <button onClick={() => navigate('/nfa/new')} className="btn-primary">
            <Plus size={16} /> Create NFA
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : nfas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileCheck size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No NFAs yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>NFA #</th>
                  <th>Indent</th>
                  <th>Amount</th>
                  <th>Payment Terms</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {nfas.map((nfa) => (
                  <tr key={nfa.id}>
                    <td><span className="font-mono text-primary-700 font-semibold text-sm">{nfa.nfaNumber}</span></td>
                    <td>
                      <Link to={`/indents/${nfa.indentId}`} className="text-primary-700 hover:underline text-sm">
                        {nfa.indent?.indentNumber}
                      </Link>
                    </td>
                    <td className="font-semibold">{formatCurrency(nfa.totalAmount)}</td>
                    <td className="text-sm text-gray-600">{nfa.paymentTerms || '—'}</td>
                    <td>
                      {/* Signing progress dots */}
                      <div className="flex gap-1">
                        {['GM_SIGNED','USER_SIGNED','CFO_SIGNED','PRESIDENT_SIGNED','DIR_SIGNED','MD_APPROVED'].map((step) => {
                          const order = ['DRAFT','GM_SIGNED','USER_SIGNED','CFO_SIGNED','PRESIDENT_SIGNED','DIR_SIGNED','MD_APPROVED','MD_REJECTED']
                          const current = order.indexOf(nfa.status)
                          const stepIdx = order.indexOf(step)
                          return (
                            <div
                              key={step}
                              className={`w-3 h-3 rounded-full ${current >= stepIdx ? 'bg-green-500' : 'bg-gray-200'}`}
                              title={step.replace('_', ' ')}
                            />
                          )
                        })}
                      </div>
                    </td>
                    <td><span className={STATUS_BADGE[nfa.status] || 'badge badge-gray'}>{STATUS_LABEL[nfa.status] || nfa.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/nfa/${nfa.id}`} className="p-1.5 rounded text-gray-500 hover:text-primary-700 hover:bg-primary-50" title="View">
                          <Eye size={14} />
                        </Link>
                        {canSign(nfa) && (
                          <button
                            onClick={() => { setActionLoading(nfa.id); doAction(() => nfaService.sign(nfa.id, signAction), 'NFA signed') }}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Sign NFA"
                          ><PenLine size={14} /></button>
                        )}
                        {isMD && nfa.status === 'DIR_SIGNED' && (
                          <>
                            <button onClick={() => { setActionLoading(nfa.id + '_approve'); doAction(() => nfaService.mdAction(nfa.id, 'approve', ''), 'NFA approved by MD') }} disabled={!!actionLoading}
                              className="p-1.5 rounded text-green-600 hover:bg-green-50" title="MD Approve"><CheckCircle size={14} /></button>
                            <button onClick={() => { const n = window.prompt('Reason:'); if (n !== null) { setActionLoading(nfa.id + '_reject'); doAction(() => nfaService.mdAction(nfa.id, 'reject', n), 'NFA rejected by MD') } }} disabled={!!actionLoading}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50" title="MD Reject"><XCircle size={14} /></button>
                            <button onClick={() => { const n = window.prompt('Hold reason:'); if (n !== null) { setActionLoading(nfa.id + '_hold'); doAction(() => nfaService.mdAction(nfa.id, 'hold', n), 'NFA on hold') } }} disabled={!!actionLoading}
                              className="p-1.5 rounded text-orange-500 hover:bg-orange-50" title="MD Hold"><PauseCircle size={14} /></button>
                          </>
                        )}
                        {nfa.status === 'MD_APPROVED' && isPurchaseHOD && (
                          <Link to={`/purchases/new?nfaId=${nfa.id}&indentId=${nfa.indentId}`}
                            className="text-xs px-2 py-1 bg-primary-700 text-white rounded hover:bg-primary-800">
                            Create PO
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

export default NFAPage
