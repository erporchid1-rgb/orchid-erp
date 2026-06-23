import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { purchasesService } from '../../services'
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/helpers'
import { ArrowLeft, Printer, CheckCircle, XCircle, Send, FileCheck, Pencil } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_LABEL = {
  DRAFT:            'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED:         'Approved',
  CONFIRMED:        'Confirmed (Placed)',
  RECEIVED:         'Received',
  REJECTED:         'Rejected',
  CANCELLED:        'Cancelled',
}

const fmt = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const fmtAmt = (val) =>
  val != null && val !== ''
    ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
    : '0.00'

// Convert number to words (Indian system)
const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
              'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
              'Seventeen','Eighteen','Nineteen']
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
const toWords = (n) => {
  n = Math.round(n)
  if (n === 0) return 'Zero'
  const crore = Math.floor(n / 10000000)
  const lakh  = Math.floor((n % 10000000) / 100000)
  const thou  = Math.floor((n % 100000) / 1000)
  const hun   = Math.floor((n % 1000) / 100)
  const rem   = n % 100
  const twoDigit = (num) => {
    if (num < 20) return ones[num]
    return tens[Math.floor(num/10)] + (num%10 ? ' ' + ones[num%10] : '')
  }
  let result = ''
  if (crore) result += twoDigit(crore) + ' Crore '
  if (lakh)  result += twoDigit(lakh)  + ' Lakh '
  if (thou)  result += twoDigit(thou)  + ' Thousand '
  if (hun)   result += ones[hun] + ' Hundred '
  if (rem)   result += twoDigit(rem)
  return result.trim()
}

const amountInWords = (total) => {
  if (!total) return ''
  const rupees = Math.floor(total)
  const paisa  = Math.round((total - rupees) * 100)
  let words = toWords(rupees) + ' Rupees'
  if (paisa) words += ' and ' + toWords(paisa) + ' Paisa'
  return words + ' Only'
}

const PurchaseDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [purchase, setPurchase] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [acting,   setActing]   = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')

  const isAdmin       = ['ADMIN', 'PURCHASE_HOD', 'GM_PURCHASE', 'MD', 'EXE_DIRECTOR'].includes(user?.role)
  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'].includes(user?.role)

  const load = () => {
    purchasesService.getById(id)
      .then(({ data }) => setPurchase(data.data))
      .catch(() => { toast.error('Purchase not found'); navigate('/purchases') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const act = async (fn, msg) => {
    setActing(true)
    try { await fn(); toast.success(msg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed') }
    finally { setActing(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
  if (!purchase) return null

  // Per-item base amount (ex-GST)
  const itemBase = (item) => (parseFloat(item.quantity)||0) * (parseFloat(item.rate)||0)
  const baseTotal = purchase.items.reduce((s, i) => s + itemBase(i), 0)
  const gstTotal  = purchase.gstAmount || 0
  const transport = parseFloat(purchase.transportCost) || 0

  // Terms & Conditions lines
  const tcLines = (purchase.termsConditions || '').split('\n').filter(l => l.trim())

  // Standard footer T&C always appended (9-13)
  const footerTC = [
    `Indent No.: This material is required against Indent No. ${purchase.indent?.indentNumber || '—'}.`,
    `In case the supplier's material stands rejected as per the Test Report conducted on our behalf, OIDPL shall have rights to reject the materials and to recover the cost of all such testing from the supplier's pending/future bill. Supplier shall lift the rejected materials on his own cost within 48 hours of intimation.`,
    `Site Address: ${purchase.site?.siteName || ''}${purchase.site?.address ? ', ' + purchase.site.address : ''}, ${purchase.project?.projectName || ''}.`,
    `Billing Address: M/s Orchid Infrastructure Developers Pvt. Ltd., Level-II, Global Arcade, M.G. Road, Gurugram, Haryana. GSTIN: 06AAACB0370M1ZV`,
    `Contact Person: ${purchase.contactPerson || '—'}${purchase.contactMobile ? ' (Mobile: ' + purchase.contactMobile + ')' : ''}`,
  ]

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #po-print-area, #po-print-area * { visibility: visible; }
          #po-print-area { position: fixed; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Screen header ── */}
      <div className="no-print">
        <div className="page-header">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
              <ArrowLeft size={15} /> Back
            </button>
            <h1 className="page-title">PO — <span className="font-mono text-primary-700">{purchase.billNo}</span></h1>
            <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
              <span className={getStatusBadge(purchase.status)}>{STATUS_LABEL[purchase.status] || purchase.status}</span>
              {purchase.indent && (
                <Link to={`/indents/${purchase.indent.id}`} className="text-primary-700 hover:underline flex items-center gap-1">
                  Indent: {purchase.indent.indentNumber}
                </Link>
              )}
              {purchase.nfa && (
                <Link to={`/nfa/${purchase.nfa.id}`} className="text-primary-700 hover:underline flex items-center gap-1">
                  <FileCheck size={13} /> NFA: {purchase.nfa.nfaNumber}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {purchase.status === 'DRAFT' && isPurchaseHOD && (
              <button onClick={() => act(() => purchasesService.submitForApproval(id), 'Sent for approval')}
                disabled={acting} className="btn-primary flex items-center gap-2">
                <Send size={14} /> Submit for Approval
              </button>
            )}
            {purchase.status === 'PENDING_APPROVAL' && isAdmin && (
              <>
                <button onClick={() => act(() => purchasesService.approve(id, approvalNotes), 'Purchase approved')}
                  disabled={acting} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <CheckCircle size={14} /> Approve
                </button>
                <button onClick={() => {
                  if (!approvalNotes.trim()) return toast.error('Enter rejection reason')
                  act(() => purchasesService.reject(id, approvalNotes), 'Purchase rejected')
                }} disabled={acting} className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                  <XCircle size={14} /> Reject
                </button>
              </>
            )}
            {purchase.status === 'PENDING_APPROVAL' && isAdmin && (
              <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)}
                className="input text-sm" rows={1} placeholder="Notes (required for rejection)..." />
            )}
            <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
              <Printer size={15} /> Print PO
            </button>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Supplier',  value: purchase.supplier?.supplierName },
            { label: 'Project',   value: purchase.project?.projectName || '—' },
            { label: 'Site',      value: purchase.site?.siteName || '—' },
            { label: 'Total',     value: formatCurrency(purchase.totalAmount) },
          ].map(({ label, value }) => (
            <div key={label} className="card p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-semibold text-gray-800 mt-0.5 text-sm">{value}</p>
            </div>
          ))}
        </div>

        {/* Items table on screen */}
        <div className="card mb-5">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Items</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#','Material','Unit','Qty','Rate','GST%','Amount'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchase.items?.map((item, i) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                    <td className="px-3 py-2 font-medium">{item.material?.materialName}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">₹{fmtAmt(item.rate)}</td>
                    <td className="px-3 py-2">{item.gstPercent}%</td>
                    <td className="px-3 py-2 font-semibold">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end p-4 border-t text-sm">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal (ex-GST)</span><span>{formatCurrency(baseTotal)}</span></div>
              {transport > 0 && <div className="flex justify-between"><span className="text-gray-600">Transport</span><span>{formatCurrency(transport)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">GST</span><span>{formatCurrency(gstTotal)}</span></div>
              {parseFloat(purchase.discountAmount) > 0 && (
                <div className="flex justify-between text-red-600"><span>Discount</span><span>- {formatCurrency(purchase.discountAmount)}</span></div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Grand Total</span><span className="text-primary-700">{formatCurrency(purchase.totalAmount)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINTABLE PO (A4) ── */}
      <div id="po-print-area">
        {purchase.status === 'DRAFT' && (
          <div className="no-print flex justify-end p-2 bg-amber-50 border-b border-amber-200">
            <Link to={`/purchases/${purchase.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors">
              <Pencil size={13}/> Edit PO
            </Link>
          </div>
        )}
        <div style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          lineHeight: '1.55',
          maxWidth: '740px',
          margin: '0 auto',
          padding: '20px',
          backgroundColor: '#fff',
          color: '#000',
        }}>

          {/* ── TOP: Ref & Date (right-aligned) ── */}
          <div style={{ textAlign: 'right', marginBottom: '18px' }}>
            <div><strong>Ref.: {purchase.billNo}</strong></div>
            <div>{fmt(purchase.purchaseDate)}</div>
          </div>

          {/* ── Supplier Address Block ── */}
          <div style={{ marginBottom: '14px' }}>
            <div><strong>M/s {purchase.supplier?.supplierName}</strong></div>
            {purchase.supplier?.address && (
              <div style={{ whiteSpace: 'pre-line' }}>{purchase.supplier.address}</div>
            )}
            {purchase.supplier?.gstNumber && (
              <div><strong>GSTIN: {purchase.supplier.gstNumber}</strong></div>
            )}
          </div>

          {purchase.supplier?.email && (
            <div style={{ marginBottom: '6px' }}>
              <strong>E-mail: </strong>{purchase.supplier.email}
            </div>
          )}

          {(purchase.attnPerson || purchase.attnMobile) && (
            <div style={{ marginBottom: '14px' }}>
              <strong>Kind Attn.: </strong>
              {purchase.attnPerson}
              {purchase.attnMobile && ` (Mob. # ${purchase.attnMobile})`}
            </div>
          )}

          {/* ── Subject ── */}
          <div style={{ marginBottom: '14px' }}>
            <strong>Sub.: </strong>
            {purchase.notes || `Order for Supply of materials for ${purchase.project?.projectName || ''}`}
          </div>

          {/* ── Dear Sir body ── */}
          <div style={{ marginBottom: '14px' }}>
            Dear Sir,
            <br />
            {purchase.refInvoiceNo
              ? `With reference to your pro-forma invoice no. ${purchase.refInvoiceNo}${purchase.refInvoiceDate ? ', dated ' + fmt(purchase.refInvoiceDate) : ''} and subsequent discussions with us, we are pleased to place an order for the following, on the agreed rates, terms & conditions mentioned below:—`
              : `With reference to our discussions with you, we are pleased to place an order for the following, on the agreed rates, terms & conditions mentioned below:—`
            }
          </div>

          {/* ── Items Table ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                {['Sr. No.', 'Item Description', 'UoM', 'Qty', 'Rate', 'Amount'].map(h => (
                  <th key={h} style={{
                    padding: '5px 8px',
                    textAlign: h === 'Qty' || h === 'Rate' || h === 'Amount' ? 'right' : 'left',
                    fontWeight: 'bold',
                    borderRight: '1px solid #ccc',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchase.items?.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #ccc', verticalAlign: 'top' }}>{i+1}</td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #ccc' }}>
                    {item.material?.materialName}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>{item.unit}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>{item.quantity}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>₹{fmtAmt(item.rate)}/-</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{fmtAmt(itemBase(item))}.00/-</td>
                </tr>
              ))}

              {/* Total Qty / Total Amount row */}
              <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #ccc' }}>
                <td colSpan={2} style={{ padding: '4px 8px', borderRight: '1px solid #ccc' }} />
                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #ccc' }}>
                  {purchase.items?.reduce((s,i) => s + (parseFloat(i.quantity)||0), 0)}
                </td>
                <td colSpan={2} style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #ccc' }}>Total Amt.</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>₹{fmtAmt(baseTotal)}.00/-</td>
              </tr>

              {/* Freight */}
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <td colSpan={5} style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>Freight</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                  {transport > 0 ? `₹${fmtAmt(transport)}/-` : 'FOR'}
                </td>
              </tr>

              {/* GST */}
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <td colSpan={5} style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>
                  {(() => {
                    const pcts = [...new Set((purchase.items||[]).map(i => i.gstPercent).filter(Boolean))]
                    return pcts.length === 1 ? `GST @ ${pcts[0]}%` : `GST`
                  })()}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>₹{fmtAmt(gstTotal)}/-</td>
              </tr>

              {/* Discount */}
              {parseFloat(purchase.discountAmount) > 0 && (
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <td colSpan={5} style={{ padding: '4px 8px', textAlign: 'right', borderRight: '1px solid #ccc' }}>Discount</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: '#dc2626' }}>- ₹{fmtAmt(purchase.discountAmount)}/-</td>
                </tr>
              )}

              {/* Grand Total */}
              <tr style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                <td colSpan={5} style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #ccc' }}>
                  Grand Total
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                  ₹{fmtAmt(purchase.totalAmount)}/-
                </td>
              </tr>
            </tbody>
          </table>

          {/* Amount in words */}
          <div style={{ marginBottom: '14px', fontStyle: 'italic' }}>
            ({amountInWords(purchase.totalAmount)})
          </div>

          {/* Note (i)(ii) */}
          <div style={{ marginBottom: '14px' }}>
            <strong>Note: -</strong><br />
            (i) Manufacturer&apos;s Test Certificate to be furnished.<br />
            (ii) The quantity of the purchase order can vary ± 0.5%
          </div>

          {/* Terms & Conditions */}
          {tcLines.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <strong>Terms & Conditions:</strong>
              <ol style={{ paddingLeft: '0', listStyle: 'none', margin: '4px 0 0 0' }}>
                {tcLines.map((line, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{line}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Page continuation marker */}
          <div style={{ textAlign: 'right', marginBottom: '8px', fontWeight: 'bold' }}>
            Contd.../-2-/
          </div>

          {/* ── PAGE BREAK ── */}
          <div style={{ pageBreakBefore: 'always', paddingTop: '20px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>
              ::- 2 -::
            </div>

            {/* Footer T&C (9-13) */}
            <ol style={{ paddingLeft: '0', listStyle: 'none', margin: '0 0 16px 0' }}>
              {footerTC.map((line, i) => (
                <li key={i} style={{ marginBottom: '5px' }}>
                  <strong>{i + 9}.</strong> {line}
                </li>
              ))}
            </ol>

            <div style={{ marginBottom: '20px', fontWeight: 'bold' }}>
              You are requested to dispatch the materials immediately.
            </div>

            <div style={{ marginBottom: '60px' }}>
              Thanking You,<br />
              Yours Faithfully<br />
              <strong>For Orchid Infrastructure Developers Pvt. Ltd.</strong>
            </div>

            {/* Signature box */}
            <div style={{ marginTop: '50px', borderTop: '1px solid #000', paddingTop: '8px', width: '220px' }}>
              <strong>(Authorized Signatory)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PurchaseDetailPage
