import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { purchasesService } from '../../services'
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/helpers'
import { ArrowLeft, Download, CheckCircle, XCircle, Send, Upload, FileText, ClipboardList } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_STEPS = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'RECEIVED']

const STATUS_LABEL = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  CONFIRMED: 'Confirmed',
  RECEIVED: 'Received',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

const PurchaseDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [purchase, setPurchase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const quotationRefs = [useRef(), useRef(), useRef()]

  const isAdmin = user?.role === 'ADMIN'
  const isStoreOrAdmin = ['ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'].includes(user?.role)
  const isSiteEngineer = user?.role === 'SITE_ENGINEER'

  const load = () => {
    purchasesService.getById(id)
      .then(({ data }) => setPurchase(data.data))
      .catch(() => { toast.error('Purchase not found'); navigate('/purchases') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const act = async (fn, successMsg) => {
    setActing(true)
    try { await fn(); toast.success(successMsg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setActing(false) }
  }

  const handleSubmitForApproval = () => act(() => purchasesService.submitForApproval(id), 'Sent for management approval')
  const handleApprove = () => act(() => purchasesService.approve(id, approvalNotes), 'Purchase approved')
  const handleReject = () => {
    if (!approvalNotes.trim()) return toast.error('Please enter rejection reason')
    act(() => purchasesService.reject(id, approvalNotes), 'Purchase rejected')
  }
  const handleStatus = (status) => act(() => purchasesService.updateStatus(id, status), `Marked as ${status}`)

  const handleDownloadPDF = async () => {
    try {
      const res = await purchasesService.getPDF(id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `invoice-${purchase.billNo}.pdf`; a.click()
    } catch { toast.error('PDF generation failed') }
  }

  const handleQuotationUpload = async (num, file) => {
    const fd = new FormData(); fd.append('file', file)
    try {
      await purchasesService.uploadQuotation(id, num, fd)
      toast.success(`Quotation ${num} uploaded`)
      load()
    } catch { toast.error('Upload failed') }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" style={{ borderWidth: '3px' }} /></div>
  if (!purchase) return null

  const stepIdx = STATUS_STEPS.indexOf(purchase.status)
  const isRejected = purchase.status === 'REJECTED'
  const isCancelled = purchase.status === 'CANCELLED'

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex-1">
          <h1 className="page-title">Purchase Order — <span className="font-mono text-primary-700">{purchase.billNo}</span></h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* DRAFT → Submit for approval */}
          {purchase.status === 'DRAFT' && isStoreOrAdmin && (
            <button onClick={handleSubmitForApproval} disabled={acting} className="btn-primary btn-sm">
              <Send size={14} /> Submit for Approval
            </button>
          )}
          {/* PENDING_APPROVAL → Admin approves or rejects */}
          {/* Actions are in the approval card below */}
          {/* APPROVED → Confirm PO */}
          {purchase.status === 'APPROVED' && isStoreOrAdmin && (
            <button onClick={() => handleStatus('CONFIRMED')} disabled={acting} className="btn-success btn-sm">
              <CheckCircle size={14} /> Confirm PO
            </button>
          )}
          {/* CONFIRMED → Site incharge marks received */}
          {purchase.status === 'CONFIRMED' && (
            <button onClick={() => handleStatus('RECEIVED')} disabled={acting} className="btn-success btn-sm">
              <CheckCircle size={14} /> Mark Received
            </button>
          )}
          {/* Cancel (any stage except terminal) */}
          {!['RECEIVED', 'CANCELLED', 'REJECTED'].includes(purchase.status) && isStoreOrAdmin && (
            <button onClick={() => handleStatus('CANCELLED')} disabled={acting} className="btn-danger btn-sm">
              <XCircle size={14} /> Cancel
            </button>
          )}
          {/* PDF download */}
          {purchase.status === 'RECEIVED' && (
            <button onClick={handleDownloadPDF} className="btn-secondary btn-sm"><Download size={14} /> Invoice PDF</button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isRejected && !isCancelled && (
        <div className="card mb-4 p-4">
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${i > 0 ? 'flex-1' : ''}`}>
                  {i > 0 && <div className={`h-0.5 w-full mb-2 ${i <= stepIdx ? 'bg-primary-600' : 'bg-gray-200'}`} />}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < stepIdx ? 'bg-primary-600 text-white' :
                    i === stepIdx ? 'bg-primary-700 text-white ring-2 ring-primary-200' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {i < stepIdx ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs mt-1 whitespace-nowrap ${i === stepIdx ? 'text-primary-700 font-semibold' : 'text-gray-400'}`}>
                    {STATUS_LABEL[step]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Management Approval Section */}
      {purchase.status === 'PENDING_APPROVAL' && isAdmin && (
        <div className="card mb-4 border-amber-200 bg-amber-50">
          <div className="card-body">
            <h3 className="font-semibold text-amber-800 mb-3">Management Approval Required</h3>
            <p className="text-sm text-amber-700 mb-3">
              Purchase order <strong>{purchase.billNo}</strong> for <strong>{formatCurrency(purchase.totalAmount)}</strong> is awaiting your approval.
            </p>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="input mb-3"
              rows={2}
              placeholder="Notes (required for rejection, optional for approval)..."
            />
            <div className="flex gap-2">
              <button onClick={handleApprove} disabled={acting} className="btn-success">
                <CheckCircle size={14} /> Approve Purchase
              </button>
              <button onClick={handleReject} disabled={acting} className="btn-danger">
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection notice */}
      {isRejected && (
        <div className="card mb-4 border-red-200 bg-red-50">
          <div className="card-body">
            <p className="font-semibold text-red-700">Purchase Rejected</p>
            <p className="text-sm text-red-600 mt-1">Rejected by: {purchase.approvedBy?.name}</p>
            {purchase.approvalNotes && <p className="text-sm text-red-600 mt-1">Reason: {purchase.approvalNotes}</p>}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="card mb-4">
        <div className="card-body flex flex-wrap items-center gap-6">
          {[
            { label: 'Status', value: <span className={getStatusBadge(purchase.status)}>{STATUS_LABEL[purchase.status] || purchase.status}</span> },
            { label: 'Date', value: formatDate(purchase.purchaseDate) },
            { label: 'Supplier', value: purchase.supplier?.supplierName },
            { label: 'Project', value: purchase.project?.projectName || '—' },
            { label: 'Site', value: purchase.site?.siteName || '—' },
            { label: 'Ordered By', value: purchase.orderedBy?.name },
            ...(purchase.approvedBy ? [{ label: 'Approved By', value: purchase.approvedBy?.name }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <div className="font-semibold text-gray-800 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
        {/* Linked indent */}
        {purchase.indent && (
          <div className="px-6 pb-4">
            <Link to={`/indents/${purchase.indent.id}`} className="inline-flex items-center gap-2 text-sm text-primary-700 hover:underline">
              <ClipboardList size={14} /> Indent: {purchase.indent.indentNumber}
              {purchase.indent.purpose && ` — ${purchase.indent.purpose}`}
            </Link>
          </div>
        )}
      </div>

      {/* Quotations */}
      {isStoreOrAdmin && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Supplier Quotations</h3>
            <p className="text-xs text-gray-500">Upload quotations from 3 suppliers for comparison</p>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((num) => {
              const file = purchase[`quotation${num}File`]
              return (
                <div key={num} className="border rounded-lg p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">Quotation {num}</p>
                  {file ? (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-green-600" />
                      <a href={`/uploads/${file}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-700 hover:underline truncate">{file}</a>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mb-2">Not uploaded</p>
                  )}
                  {!['RECEIVED', 'REJECTED', 'CANCELLED'].includes(purchase.status) && (
                    <>
                      <input
                        ref={quotationRefs[num - 1]}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => e.target.files[0] && handleQuotationUpload(num, e.target.files[0])}
                      />
                      <button
                        onClick={() => quotationRefs[num - 1].current.click()}
                        className="btn btn-secondary btn-sm mt-2 w-full justify-center"
                      >
                        <Upload size={12} /> {file ? 'Replace' : 'Upload'}
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="card mb-4">
        <div className="card-header"><h3 className="font-semibold text-gray-800">Purchase Items</h3></div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead><tr><th>#</th><th>Material</th><th>Category</th><th>Unit</th><th>Quantity</th><th>Rate</th><th>GST%</th><th>Amount</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {purchase.items?.map((item, i) => (
                <tr key={item.id}>
                  <td>{i + 1}</td>
                  <td className="font-medium">{item.material?.materialName}</td>
                  <td>{item.material?.category?.name}</td>
                  <td>{item.unit}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.rate)}</td>
                  <td>{item.gstPercent}%</td>
                  <td className="font-semibold">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end p-5 border-t border-gray-100">
          <div className="w-64 space-y-2">
            {[
              { label: 'Subtotal', value: purchase.subtotal },
              { label: 'GST', value: purchase.gstAmount },
              ...(parseFloat(purchase.transportCost) > 0 ? [{ label: 'Transport', value: purchase.transportCost }] : []),
              ...(parseFloat(purchase.discountAmount) > 0 ? [{ label: 'Discount', value: -purchase.discountAmount }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className={parseFloat(value) < 0 ? 'text-red-600' : ''}>{formatCurrency(Math.abs(value))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total Amount</span>
              <span className="text-primary-700">{formatCurrency(purchase.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-800">Supplier Details</h3></div>
        <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Name', value: purchase.supplier?.supplierName },
            { label: 'Mobile', value: purchase.supplier?.mobile },
            { label: 'Email', value: purchase.supplier?.email || '—' },
            { label: 'GST', value: purchase.supplier?.gstNumber || '—' },
            { label: 'Address', value: purchase.supplier?.address || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-medium text-gray-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PurchaseDetailPage
