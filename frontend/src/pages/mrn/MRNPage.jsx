import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mrnService } from '../../services'
import { formatDate } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { Truck, Plus, Eye, CheckCircle, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  DRAFT:     'badge badge-gray',
  COMPLETE:  'badge badge-green',
  PARTIAL:   'badge badge-yellow',
  EXCESS:    'badge badge-orange',
  RATE_DIFF: 'badge badge-red',
}

const RECEIPT_TYPE_LABEL = {
  PURCHASE:       'Purchase',
  GATE_PASS:      'Gate Pass',
  NRGP:           'Non-Returnable GP',
  SITE_TRANSFER:  'Site Transfer',
}

const MRNPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mrns, setMRNs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const isStore       = ['STORE_MANAGER', 'INCHARGE', 'SITE_ENGINEER', 'ADMIN'].includes(user?.role)
  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'].includes(user?.role)
  const isFinance     = ['FINANCE', 'ACCOUNTANT', 'CFO', 'ADMIN'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await mrnService.getAll({ limit: 100 })
      setMRNs(data.data || [])
    } catch { toast.error('Failed to load MRNs') }
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
          <h1 className="page-title flex items-center gap-2"><Truck size={22} /> Materials Receiving Note (MRN)</h1>
          <p className="page-subtitle">Record material receipt against Purchase Orders</p>
        </div>
        {isStore && (
          <button onClick={() => navigate('/mrn/new')} className="btn-primary">
            <Plus size={16} /> New MRN
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : mrns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Truck size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No MRNs yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>MRN #</th>
                  <th>PO / Receipt Type</th>
                  <th>Supplier</th>
                  <th>MRN Date</th>
                  <th>Invoice No.</th>
                  <th>Status</th>
                  <th>Finance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {mrns.map((mrn) => (
                  <tr key={mrn.id}>
                    <td><span className="font-mono text-primary-700 font-semibold text-sm">{mrn.mrnNumber}</span></td>
                    <td>
                      {mrn.purchase ? (
                        <Link to={`/purchases/${mrn.purchaseId}`} className="text-primary-700 hover:underline text-sm font-medium">
                          {mrn.purchase.billNo}
                        </Link>
                      ) : <span className="text-gray-500">—</span>}
                      <p className="text-xs text-gray-400">{RECEIPT_TYPE_LABEL[mrn.receiptType] || mrn.receiptType}</p>
                    </td>
                    <td className="text-sm">{mrn.purchase?.supplier?.supplierName || '—'}</td>
                    <td>{formatDate(mrn.mrnDate)}</td>
                    <td className="font-mono text-sm">{mrn.invoiceNo || '—'}</td>
                    <td><span className={STATUS_BADGE[mrn.status] || 'badge badge-gray'}>{mrn.status}</span></td>
                    <td>
                      {mrn.forwardedToFinance ? (
                        <span className="badge badge-green text-xs">Forwarded</span>
                      ) : (
                        <span className="badge badge-gray text-xs">Pending</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/mrn/${mrn.id}`} className="p-1.5 rounded text-gray-500 hover:text-primary-700 hover:bg-primary-50" title="View">
                          <Eye size={14} />
                        </Link>
                        {isStore && mrn.status === 'DRAFT' && !mrn.storeVerifiedAt && (
                          <button
                            onClick={() => { setActionLoading(mrn.id + '_store'); doAction(() => mrnService.storeVerify(mrn.id), 'MRN store verified — stock updated') }}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-green-600 hover:bg-green-50" title="Store Verify & Update Stock"
                          ><CheckCircle size={14} /></button>
                        )}
                        {isPurchaseHOD && mrn.storeVerifiedAt && !mrn.forwardedToFinance && (
                          <button
                            onClick={() => { setActionLoading(mrn.id + '_purchase'); doAction(() => mrnService.purchaseVerify(mrn.id), 'MRN verified and forwarded to Finance') }}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50" title="Purchase HOD Verify & Forward to Finance"
                          ><CheckCircle size={14} /></button>
                        )}
                        {isFinance && mrn.forwardedToFinance && !mrn.poClosed && (
                          <button
                            onClick={() => { setActionLoading(mrn.id + '_close'); doAction(() => mrnService.closePO(mrn.id), 'PO closed after final payment') }}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded text-purple-600 hover:bg-purple-50" title="Close PO after payment"
                          ><DollarSign size={14} /></button>
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

export default MRNPage
