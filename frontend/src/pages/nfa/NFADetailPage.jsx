import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { nfaService } from '../../services'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Printer, PenLine, CheckCircle, XCircle, PauseCircle, FileCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  DRAFT:            'badge badge-gray',
  GM_SIGNED:        'badge badge-blue',
  USER_SIGNED:      'badge badge-blue',
  CFO_SIGNED:       'badge badge-blue',
  PRESIDENT_SIGNED: 'badge badge-blue',
  DIR_SIGNED:       'badge badge-yellow',
  MD_APPROVED:      'badge badge-green',
  MD_REJECTED:      'badge badge-red',
  MD_HOLD:          'badge badge-orange',
}

const STATUS_LABEL = {
  DRAFT: 'Draft',
  GM_SIGNED: 'GM Signed',
  USER_SIGNED: 'User Dept Signed',
  CFO_SIGNED: 'CFO Signed',
  PRESIDENT_SIGNED: 'President Signed',
  DIR_SIGNED: 'Exe. Director Signed',
  MD_APPROVED: 'MD Approved',
  MD_REJECTED: 'MD Rejected',
  MD_HOLD: 'MD Hold',
}

const fmt = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

const fmtAmt = (val) =>
  val != null && val !== ''
    ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
    : '0.00'

const Row = ({ label, value, bold }) => (
  <tr>
    <td style={{ padding: '6px 14px', fontWeight: '600', borderRight: '1px solid #ccc', width: '220px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
      {label}
    </td>
    <td style={{ padding: '6px 14px', fontWeight: bold ? 'bold' : 'normal' }}>
      {value || '—'}
    </td>
  </tr>
)

const NFADetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [nfa, setNFA] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const isMD         = ['MD', 'ADMIN'].includes(user?.role)
  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'].includes(user?.role)

  const signAction = {
    GM_PURCHASE:        'gm_sign',
    USER_HOD:           'user_sign',
    CFO:                'cfo_sign',
    PRESIDENT_PROJECTS: 'president_sign',
    EXE_DIRECTOR:       'dir_sign',
  }[user?.role]

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await nfaService.getById(id)
      setNFA(data.data)
    } catch { toast.error('Failed to load NFA') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const canSign = () => {
    if (!signAction || !nfa) return false
    const needsMap = {
      gm_sign:        'DRAFT',
      user_sign:      'GM_SIGNED',
      cfo_sign:       'USER_SIGNED',
      president_sign: 'CFO_SIGNED',
      dir_sign:       'PRESIDENT_SIGNED',
    }
    return nfa.status === needsMap[signAction]
  }

  const doAction = async (fn, msg) => {
    setActionLoading(true)
    try { await fn(); toast.success(msg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActionLoading(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
  if (!nfa) return <div className="text-center py-20 text-gray-500">NFA not found</div>

  const projectSite = [
    nfa.indent?.project?.projectName,
    nfa.indent?.site?.siteName,
    nfa.indent?.project?.location,
  ].filter(Boolean).join(', ')

  const attachment = [
    nfa.quotationDate    ? `Quotation Dated ${fmt(nfa.quotationDate)}`   : '',
    nfa.comparativeDate  ? `Comparative dated ${fmt(nfa.comparativeDate)}` : '',
  ].filter(Boolean).join(', ')

  // Signing step checklist for the screen banner
  const STEPS = [
    { label: 'GM — Purchase',       who: nfa.gmSignedBy,        at: nfa.gmSignedAt },
    { label: 'User Department',     who: nfa.userSignedBy,      at: nfa.userSignedAt },
    { label: 'CFO',                 who: nfa.cfoSignedBy,       at: nfa.cfoSignedAt },
    { label: 'President — Projects', who: nfa.presidentSignedBy, at: nfa.presidentSignedAt },
    { label: 'Exe. Director',       who: nfa.dirSignedBy,       at: nfa.dirSignedAt },
    { label: 'MD Approval',         who: nfa.mdApprovedBy,      at: nfa.mdApprovedAt, isMdStep: true },
  ]

  const sigBox = (name, role, date) => (
    <div style={{ minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginTop: '6px' }}>
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{name || '................................'}</div>
        <div style={{ fontSize: '12px', color: '#555' }}>{role}</div>
        {date && <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{fmt(date)}</div>}
      </div>
    </div>
  )

  return (
    <div>
      {/* Print CSS — hides everything except the memo */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #nfa-print-area, #nfa-print-area * { visibility: visible; }
          #nfa-print-area { position: fixed; left: 0; top: 0; width: 100%; padding: 16px; }
        }
      `}</style>

      {/* ── Screen-only header ── */}
      <div className="no-print">
        <div className="page-header">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
              <ArrowLeft size={15} /> Back
            </button>
            <h1 className="page-title flex items-center gap-2">
              <FileCheck size={22} /> NFA — {nfa.nfaNumber}
            </h1>
            <p className="page-subtitle flex items-center gap-2">
              <Link to={`/indents/${nfa.indentId}`} className="text-primary-700 hover:underline">
                Indent: {nfa.indent?.indentNumber}
              </Link>
              <span>·</span>
              <span className={STATUS_BADGE[nfa.status] || 'badge badge-gray'}>
                {STATUS_LABEL[nfa.status] || nfa.status}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSign() && (
              <button
                onClick={() => doAction(() => nfaService.sign(id, signAction), 'NFA signed successfully')}
                disabled={actionLoading}
                className="btn-primary flex items-center gap-2"
              >
                <PenLine size={15} /> Sign NFA
              </button>
            )}
            {isMD && nfa.status === 'DIR_SIGNED' && (
              <>
                <button
                  onClick={() => doAction(() => nfaService.mdAction(id, 'approve', ''), 'NFA approved by MD')}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => {
                    const n = window.prompt('Rejection reason:')
                    if (n !== null) doAction(() => nfaService.mdAction(id, 'reject', n), 'NFA rejected')
                  }}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  onClick={() => {
                    const n = window.prompt('Hold reason:')
                    if (n !== null) doAction(() => nfaService.mdAction(id, 'hold', n), 'NFA on hold')
                  }}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  <PauseCircle size={14} /> Hold
                </button>
              </>
            )}
            {nfa.status === 'MD_APPROVED' && isPurchaseHOD && (
              <Link
                to={`/purchases/new?nfaId=${nfa.id}&indentId=${nfa.indentId}`}
                className="btn-primary"
              >
                Create PO
              </Link>
            )}
            <button
              onClick={() => window.print()}
              className="btn-secondary flex items-center gap-2"
            >
              <Printer size={15} /> Print NFA
            </button>
          </div>
        </div>

        {/* Signing progress timeline */}
        <div className="card mb-5">
          <div className="card-body">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Signing Progress</p>
            <div className="flex items-start gap-0">
              {STEPS.map((step, i) => {
                const done = !!step.who
                return (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
                        ${done ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <div className="text-center mt-1" style={{ minWidth: '80px' }}>
                        <p className={`text-xs font-medium ${done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</p>
                        {step.who && <p className="text-xs text-gray-500">{step.who.name}</p>}
                        {step.at  && <p className="text-xs text-gray-400">{fmt(step.at)}</p>}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Printable NFA Memo ── */}
      <div id="nfa-print-area">
        <div style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          lineHeight: '1.5',
          border: '2px solid #000',
          maxWidth: '780px',
          margin: '0 auto',
          backgroundColor: '#fff',
        }}>
          {/* Header */}
          <div style={{
            borderBottom: '2px solid #000',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.3px' }}>
                M/s Orchid Infrastructure Developers Pvt. Ltd.
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '2px' }}>
                Note for Approval — Work / Purchase Order Memo
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', flexShrink: 0, marginLeft: '20px' }}>
              <div style={{ fontWeight: '600' }}>NFA No.: {nfa.nfaNumber}</div>
              <div>Date: {fmt(nfa.createdAt)}</div>
            </div>
          </div>

          {/* Indent No */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px', display: 'flex' }}>
            <div style={{ width: '220px', fontWeight: '600', flexShrink: 0 }}>Indent No. / Reference Mail:</div>
            <div>{nfa.indent?.indentNumber || '—'}</div>
          </div>

          {/* Project/Site + Make in two columns */}
          <div style={{ borderBottom: '1px solid #ccc', display: 'flex' }}>
            <div style={{ flex: 3, borderRight: '1px solid #ccc', padding: '5px 16px', display: 'flex' }}>
              <div style={{ fontWeight: '600', flexShrink: 0, width: '150px' }}>Project / Site Name:</div>
              <div>{projectSite || '—'}</div>
            </div>
            <div style={{ flex: 2, padding: '5px 16px', display: 'flex' }}>
              <div style={{ fontWeight: '600', flexShrink: 0, width: '60px' }}>Make:</div>
              <div>{nfa.make || '—'}</div>
            </div>
          </div>

          {/* Supplier */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px', display: 'flex' }}>
            <div style={{ width: '220px', fontWeight: '600', flexShrink: 0 }}>Name of Dealer / Supplier:</div>
            <div>M/s {nfa.selectedSupplier?.supplierName || '—'}</div>
          </div>

          {/* Nature of Work */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <span style={{ fontWeight: '600' }}>Nature of Work: </span>
            <span>{nfa.natureOfWork || '—'}</span>
          </div>

          {/* Product Description */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <span style={{ fontWeight: '600' }}>Product Description / Make: </span>
            <span>{nfa.productDescription || '—'}</span>
          </div>

          {/* Item Description */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <span style={{ fontWeight: '600' }}>Item Description: </span>
            <span>{nfa.itemDescription || '—'}</span>
          </div>

          {/* Amount Table */}
          {[
            { label: 'Amount Payable',                      value: `₹ ${fmtAmt(nfa.baseAmount)}` },
            { label: 'Total',                               value: `₹ ${fmtAmt(nfa.baseAmount)}` },
            { label: `Cartage`,                             value: nfa.cartage || 'FOR' },
            { label: `GST @ ${nfa.gstPercent ?? 0}%`,      value: `₹ ${fmtAmt(nfa.gstAmount)}` },
            { label: 'Grand Total',                         value: `₹ ${fmtAmt(nfa.totalAmount)}`, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} style={{
              display: 'flex',
              borderBottom: '1px solid #ccc',
            }}>
              <div style={{
                flex: 1,
                padding: '4px 16px',
                fontWeight: bold ? 'bold' : 'normal',
                borderRight: '1px solid #ccc',
              }}>
                {label}
              </div>
              <div style={{
                width: '180px',
                padding: '4px 16px',
                textAlign: 'right',
                fontWeight: bold ? 'bold' : 'normal',
                flexShrink: 0,
              }}>
                {value}
              </div>
            </div>
          ))}

          {/* Attachment */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <span style={{ fontWeight: '600' }}>Attachment: </span>
            <span>{attachment || '—'}</span>
          </div>

          {/* Payment Terms */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <span style={{ fontWeight: '600' }}>Payment terms: </span>
            <span>{nfa.paymentTerms || '—'}</span>
          </div>

          {/* Mode of Payment */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <span style={{ fontWeight: '600' }}>Mode of Payment Preferred: </span>
            <span>{nfa.modeOfPayment || '—'}</span>
          </div>

          {/* Last Purchased */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <span style={{ fontWeight: '600' }}>Last Purchased: </span>
            <span>{nfa.lastPurchased || '—'}</span>
          </div>

          {/* Note */}
          {nfa.notes && (
            <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
              <span style={{ fontWeight: '600' }}>Note: </span>
              <span>{nfa.notes}</span>
            </div>
          )}

          {/* MD Notes (if any) */}
          {nfa.mdNotes && (
            <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px', backgroundColor: '#fef9c3' }}>
              <span style={{ fontWeight: '600' }}>MD Decision Notes: </span>
              <span>{nfa.mdNotes}</span>
            </div>
          )}

          {/* Signature Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '2px solid #000', minHeight: '100px' }}>
            {/* Left column: GM + User Dept */}
            <div style={{ borderRight: '1px solid #000', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {sigBox(nfa.gmSignedBy?.name,   'GM — Purchase',    nfa.gmSignedAt)}
              {sigBox(nfa.userSignedBy?.name,  'User Department',  nfa.userSignedAt)}
              {sigBox(nfa.cfoSignedBy?.name,   'CFO',              nfa.cfoSignedAt)}
            </div>
            {/* Right column: President + Director */}
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {sigBox(nfa.presidentSignedBy?.name, 'President — Projects', nfa.presidentSignedAt)}
              {sigBox(nfa.dirSignedBy?.name,        'Executive Director',   nfa.dirSignedAt)}
              {nfa.mdApprovedBy && sigBox(nfa.mdApprovedBy?.name, 'MD', nfa.mdApprovedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NFADetailPage
