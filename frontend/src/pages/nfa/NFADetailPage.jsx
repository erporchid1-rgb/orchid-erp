import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { nfaService } from '../../services'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Printer, PenLine, CheckCircle, XCircle, PauseCircle, FileCheck, Phone, FileSignature, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import SignatureModal from '../../components/ui/SignatureModal'

const APPROVAL_MODE_LABEL = {
  DIGITAL:    'Digital (MD signed on system)',
  HARD_COPY:  'Hard Copy (Physical signature)',
  PHONE_CALL: 'Phone / Call approval',
}

const APPROVAL_MODE_ICON = {
  DIGITAL:    FileSignature,
  HARD_COPY:  FileCheck,
  PHONE_CALL: Phone,
}

// Inline panel for Purchase HOD to record MD decision without digital signature
const RecordMdPanel = ({ onSubmit, loading }) => {
  const [action,       setAction]       = useState('approve')
  const [approvalMode, setApprovalMode] = useState('HARD_COPY')
  const [notes,        setNotes]        = useState('')

  const modeOptions = [
    { value: 'HARD_COPY',  label: 'Hard Copy', desc: 'MD signed physical document' },
    { value: 'PHONE_CALL', label: 'Phone / Call', desc: 'MD approved verbally over phone' },
  ]

  const actionOptions = [
    { value: 'approve', label: 'Approved',  color: 'bg-green-600 hover:bg-green-700', icon: CheckCircle },
    { value: 'reject',  label: 'Rejected',  color: 'bg-red-600 hover:bg-red-700',     icon: XCircle },
    { value: 'hold',    label: 'On Hold',   color: 'bg-orange-500 hover:bg-orange-600', icon: PauseCircle },
  ]

  const handleSubmit = () => {
    if (!notes.trim()) { toast.error('Notes are required — describe how MD gave approval'); return }
    onSubmit(action, notes.trim(), approvalMode)
  }

  return (
    <div className="card mb-5 border-2 border-amber-200 bg-amber-50">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-amber-700" />
          <p className="font-bold text-amber-800 text-sm">Record MD Decision</p>
          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            MD approved outside system — record it here
          </span>
        </div>

        {/* Action */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">MD Decision</p>
          <div className="flex gap-2">
            {actionOptions.map(opt => {
              const Icon = opt.icon
              return (
                <button key={opt.value}
                  onClick={() => setAction(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${action === opt.value
                      ? `${opt.color} text-white ring-2 ring-offset-1 ring-current`
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon size={14} /> {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Approval mode */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">How did MD approve?</p>
          <div className="flex gap-2">
            {modeOptions.map(opt => (
              <button key={opt.value}
                onClick={() => setApprovalMode(opt.value)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors text-left
                  ${approvalMode === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs opacity-70">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            Notes <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">
              (e.g., "MD approved on call on 11-Jun-2026 at 3pm", "Hard copy signed and filed")
            </span>
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Describe how MD gave approval or rejection..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !notes.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <CheckCircle size={14} />}
          Record MD {action === 'approve' ? 'Approval' : action === 'reject' ? 'Rejection' : 'Hold'}
        </button>
      </div>
    </div>
  )
}

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
  DRAFT:            'Draft',
  GM_SIGNED:        'GM Signed',
  USER_SIGNED:      'User Dept Signed',
  CFO_SIGNED:       'CFO Signed',
  PRESIDENT_SIGNED: 'President Signed',
  DIR_SIGNED:       'Exe. Director Signed',
  MD_APPROVED:      'MD Approved',
  MD_REJECTED:      'MD Rejected',
  MD_HOLD:          'MD Hold',
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

const NFADetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [nfa, setNFA] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Signature modal state
  const [sigModal, setSigModal] = useState({ open: false, title: '', onConfirm: null })

  const isMD          = ['MD', 'ADMIN'].includes(user?.role)
  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE'].includes(user?.role)

  const signAction = {
    GM_PURCHASE:        'gm_sign',
    USER_HOD:           'user_sign',
    CFO:                'cfo_sign',
    PRESIDENT_PROJECTS: 'president_sign',
    EXE_DIRECTOR:       'dir_sign',
  }[user?.role]

  const signLabel = {
    gm_sign:        'GM — Purchase',
    user_sign:      'User Department',
    cfo_sign:       'CFO',
    president_sign: 'President — Projects',
    dir_sign:       'Executive Director',
  }[signAction] || 'Sign'

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

  const handleRecordMd = (action, notes, approvalMode) => {
    doAction(
      () => nfaService.mdRecordAction(id, action, notes, approvalMode),
      `MD ${action === 'approve' ? 'approval' : action === 'reject' ? 'rejection' : 'hold'} recorded`
    )
  }

  const openSignModal = () => {
    setSigModal({
      open: true,
      title: `Sign as ${signLabel}`,
      onConfirm: (sigData) => {
        setSigModal(s => ({ ...s, open: false }))
        doAction(() => nfaService.sign(id, signAction, sigData), 'NFA signed successfully')
      },
    })
  }

  const openMdModal = (action) => {
    const notes = action !== 'approve' ? window.prompt(`${action === 'reject' ? 'Rejection' : 'Hold'} reason:`) : ''
    if (action !== 'approve' && notes === null) return
    setSigModal({
      open: true,
      title: `MD Signature — ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      onConfirm: (sigData) => {
        setSigModal(s => ({ ...s, open: false }))
        doAction(
          () => nfaService.mdAction(id, action, notes, sigData),
          `NFA ${action}d by MD`
        )
      },
    })
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
    nfa.quotationDate   ? `Quotation Dated ${fmt(nfa.quotationDate)}`   : '',
    nfa.comparativeDate ? `Comparative dated ${fmt(nfa.comparativeDate)}` : '',
  ].filter(Boolean).join(', ')

  const MEMO_TYPE_LABEL = {
    PO_MEMO: 'Work / Purchase Order Memo',
    SITC:    'SITC',
    AMC:     'AMC',
    CAMC:    'CAMC',
    SPO:     'SPO',
  }
  const memoTypeLabel = MEMO_TYPE_LABEL[nfa.memoType] || 'Work / Purchase Order Memo'

  // Steps for signing progress timeline
  const STEPS = [
    { label: 'GM — Purchase',       who: nfa.gmSignedBy,        at: nfa.gmSignedAt,        sig: nfa.gmSignature },
    { label: 'User Department',     who: nfa.userSignedBy,      at: nfa.userSignedAt,      sig: nfa.userSignature },
    { label: 'CFO',                 who: nfa.cfoSignedBy,       at: nfa.cfoSignedAt,        sig: nfa.cfoSignature },
    { label: 'President — Projects', who: nfa.presidentSignedBy, at: nfa.presidentSignedAt, sig: nfa.presidentSignature },
    { label: 'Exe. Director',       who: nfa.dirSignedBy,       at: nfa.dirSignedAt,        sig: nfa.dirSignature },
    { label: 'MD Approval',         who: nfa.mdApprovedBy,      at: nfa.mdApprovedAt,       sig: nfa.mdSignature },
  ]

  // Print signature box — shows image if available, else blank line
  const sigBox = (name, role, date, sigImg) => (
    <div style={{ minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {sigImg && (
        <img
          src={sigImg}
          alt={`${role} signature`}
          style={{ maxHeight: '50px', maxWidth: '160px', objectFit: 'contain', marginBottom: '4px' }}
        />
      )}
      <div style={{ borderTop: '1px solid #333', paddingTop: '5px' }}>
        <div style={{ fontWeight: '600', fontSize: '13px' }}>{name || '................................'}</div>
        <div style={{ fontSize: '12px', color: '#555' }}>{role}</div>
        {date && <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{fmt(date)}</div>}
      </div>
    </div>
  )

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #nfa-print-area, #nfa-print-area * { visibility: visible; }
          #nfa-print-area { position: fixed; left: 0; top: 0; width: 100%; padding: 16px; }
        }
      `}</style>

      {/* Signature Modal */}
      <SignatureModal
        open={sigModal.open}
        title={sigModal.title}
        loading={actionLoading}
        onConfirm={sigModal.onConfirm}
        onClose={() => setSigModal(s => ({ ...s, open: false }))}
      />

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
                onClick={openSignModal}
                disabled={actionLoading}
                className="btn-primary flex items-center gap-2"
              >
                <PenLine size={15} /> Sign as {signLabel}
              </button>
            )}
            {isMD && nfa.status === 'DIR_SIGNED' && (
              <>
                <button
                  onClick={() => openMdModal('approve')}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => openMdModal('reject')}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  onClick={() => openMdModal('hold')}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  <PauseCircle size={14} /> Hold
                </button>
              </>
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
                const isMdStep = i === STEPS.length - 1
                const modeLabel = isMdStep && nfa.mdApprovalMode && nfa.mdApprovalMode !== 'DIGITAL'
                  ? APPROVAL_MODE_LABEL[nfa.mdApprovalMode]
                  : null
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
                        {modeLabel && <p className="text-xs text-amber-600 font-medium mt-0.5">{modeLabel}</p>}
                        {nfa.mdRecordedBy && isMdStep && (
                          <p className="text-xs text-gray-400">via {nfa.mdRecordedBy.name}</p>
                        )}
                        {step.sig && (
                          <img
                            src={step.sig}
                            alt="signature"
                            className="mt-1 mx-auto border border-gray-200 rounded"
                            style={{ maxHeight: '32px', maxWidth: '72px', objectFit: 'contain' }}
                          />
                        )}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* MD Notes display */}
            {nfa.mdNotes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">MD Notes</p>
                <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  {nfa.mdNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Purchase HOD records MD decision (physical/call) */}
        {isPurchaseHOD && nfa.status === 'DIR_SIGNED' && (
          <RecordMdPanel onSubmit={handleRecordMd} loading={actionLoading} />
        )}

        {/* Create PO button (after MD approval) */}
        {nfa.status === 'MD_APPROVED' && isPurchaseHOD && (
          <div className="mb-5">
            <Link to={`/purchases/new?nfaId=${nfa.id}&indentId=${nfa.indentId}`} className="btn-primary">
              Create Purchase Order
            </Link>
          </div>
        )}
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
                Note for Approval — {memoTypeLabel}
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

          {/* Project/Site + Make + Area of Use */}
          <div style={{ borderBottom: '1px solid #ccc', display: 'flex' }}>
            <div style={{ flex: 3, borderRight: '1px solid #ccc', padding: '5px 16px', display: 'flex' }}>
              <div style={{ fontWeight: '600', flexShrink: 0, width: '150px' }}>Project / Site Name:</div>
              <div>{projectSite || '—'}</div>
            </div>
            <div style={{ flex: 2, padding: '5px 16px' }}>
              <div style={{ display: 'flex', marginBottom: '2px' }}>
                <div style={{ fontWeight: '600', flexShrink: 0, width: '60px' }}>Make:</div>
                <div>{nfa.make || '—'}</div>
              </div>
              {nfa.areaOfUse && (
                <div style={{ display: 'flex' }}>
                  <div style={{ fontWeight: '600', flexShrink: 0, width: '90px', fontSize: '11px' }}>Area of Use:</div>
                  <div style={{ fontSize: '11px' }}>{nfa.areaOfUse}</div>
                </div>
              )}
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
            <span style={{ whiteSpace: 'pre-line' }}>{nfa.itemDescription || '—'}</span>
          </div>

          {/* Amount Table */}
          {[
            { label: 'Amount Payable',                   value: `Rs. ${fmtAmt(nfa.baseAmount)}` },
            { label: 'Total',                            value: `Rs. ${fmtAmt(nfa.baseAmount)}` },
            { label: 'Cartage',                          value: nfa.cartage || 'FOR' },
            { label: `GST @ ${nfa.gstPercent ?? 0}%`,   value: `Rs. ${fmtAmt(nfa.gstAmount)}` },
            { label: 'Grand Total',                      value: `Rs. ${fmtAmt(nfa.totalAmount)}`, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
              <div style={{ flex: 1, padding: '4px 16px', fontWeight: bold ? 'bold' : 'normal', borderRight: '1px solid #ccc' }}>
                {label}
              </div>
              <div style={{ width: '180px', padding: '4px 16px', textAlign: 'right', fontWeight: bold ? 'bold' : 'normal', flexShrink: 0 }}>
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

          {/* MD Notes */}
          {nfa.mdNotes && (
            <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px', backgroundColor: '#fef9c3' }}>
              <span style={{ fontWeight: '600' }}>MD Decision Notes: </span>
              <span>{nfa.mdNotes}</span>
            </div>
          )}

          {/* Signature Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '2px solid #000', minHeight: '110px' }}>
            <div style={{ borderRight: '1px solid #000', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sigBox(nfa.gmSignedBy?.name,  'GM — Purchase',   nfa.gmSignedAt,  nfa.gmSignature)}
              {sigBox(nfa.userSignedBy?.name, 'User Department', nfa.userSignedAt, nfa.userSignature)}
              {sigBox(nfa.cfoSignedBy?.name,  'CFO',             nfa.cfoSignedAt,  nfa.cfoSignature)}
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sigBox(nfa.presidentSignedBy?.name, 'President — Projects', nfa.presidentSignedAt, nfa.presidentSignature)}
              {sigBox(nfa.dirSignedBy?.name,        'Executive Director',   nfa.dirSignedAt,        nfa.dirSignature)}
              {nfa.mdApprovedBy && sigBox(nfa.mdApprovedBy?.name, 'MD', nfa.mdApprovedAt, nfa.mdSignature)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NFADetailPage
