import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { nfaService } from '../../services'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Printer, PenLine, CheckCircle, XCircle, PauseCircle, FileCheck, Phone, FileSignature, MessageSquare, Plane, Save } from 'lucide-react'
import { DEFAULT_SIGNATORIES } from './CreateNFAPage'
import toast from 'react-hot-toast'
import SignatureModal from '../../components/ui/SignatureModal'
import { suppliersService } from '../../services'

/* Inline editable cell for NFA sheet mode */
const XCell = ({ value, onChange, type = 'text', style = {}, placeholder = '', rows }) =>
  rows
    ? <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} className="xl-input" rows={rows} placeholder={placeholder} style={style} />
    : <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className="xl-input" placeholder={placeholder} style={style} />

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
  const [saving, setSaving] = useState(false)

  // Inline-edit state (sheet mode)
  const [editNFA, setEditNFA] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [suppliers, setSuppliers] = useState([])

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

  // Init edit state when NFA loads in DRAFT
  useEffect(() => {
    if (!nfa) return
    if (nfa.status !== 'DRAFT') return
    setEditNFA({
      memoType:           nfa.memoType           || 'PO_MEMO',
      make:               nfa.make               || '',
      areaOfUse:          nfa.areaOfUse          || '',
      selectedSupplierId: nfa.selectedSupplierId || '',
      natureOfWork:       nfa.natureOfWork        || '',
      productDescription: nfa.productDescription  || '',
      itemDescription:    nfa.itemDescription     || '',
      baseAmount:         nfa.baseAmount          ?? 0,
      cartage:            nfa.cartage             || 'FOR',
      gstPercent:         nfa.gstPercent          ?? 18,
      gstAmount:          nfa.gstAmount           ?? 0,
      totalAmount:        nfa.totalAmount         ?? 0,
      quotationDate:      nfa.quotationDate   ? nfa.quotationDate.slice(0,10)   : '',
      comparativeDate:    nfa.comparativeDate ? nfa.comparativeDate.slice(0,10) : '',
      paymentTerms:       nfa.paymentTerms       || '',
      modeOfPayment:      nfa.modeOfPayment       || '',
      lastPurchased:      nfa.lastPurchased       || '',
      notes:              nfa.notes              || '',
    })
    setIsDirty(false)
    suppliersService.getAll({ limit: 200 }).then(r => setSuppliers(r.data.data || [])).catch(() => {})
  }, [nfa])

  const upd = (field, val) => {
    setEditNFA(prev => {
      const next = { ...prev, [field]: val }
      // Auto-recalc GST and total when base or percent changes
      if (field === 'baseAmount' || field === 'gstPercent') {
        const base = parseFloat(field === 'baseAmount' ? val : next.baseAmount) || 0
        const pct  = parseFloat(field === 'gstPercent'  ? val : next.gstPercent)  || 0
        next.gstAmount   = parseFloat((base * pct / 100).toFixed(2))
        next.totalAmount = parseFloat((base + base * pct / 100).toFixed(2))
      }
      return next
    })
    setIsDirty(true)
  }

  const saveNFA = async () => {
    setSaving(true)
    try {
      await nfaService.update(id, editNFA)
      toast.success('NFA saved!')
      setIsDirty(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

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

  const isNFASheet = nfa.status === 'DRAFT'

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

  // Parse custom signatories (or use defaults)
  const DEFAULT_SIG_LABELS = { gm: 'GM — Purchase', user: 'User Department', cfo: 'CFO', president: 'President — Projects', dir: 'Executive Director' }
  const customSigs = (() => {
    try { return nfa.signatories ? JSON.parse(nfa.signatories) : null } catch { return null }
  })()
  const sigLabel = (key) => customSigs?.find(s => s.key === key)?.label ?? DEFAULT_SIG_LABELS[key]
  const sigShown = (key) => customSigs ? (customSigs.find(s => s.key === key)?.show !== false) : true

  // Parse leave flags
  const leaves = (() => { try { return nfa.signatoryLeaves ? JSON.parse(nfa.signatoryLeaves) : {} } catch { return {} } })()

  // Which key is currently pending (for leave button)
  const CURRENT_KEY_MAP = { DRAFT: 'gm', GM_SIGNED: 'user', USER_SIGNED: 'cfo', CFO_SIGNED: 'president', PRESIDENT_SIGNED: 'dir' }
  const currentPendingKey = CURRENT_KEY_MAP[nfa.status] || null

  const handleMarkLeave = (key) => {
    if (!window.confirm(`Mark this signatory as "On Leave"? The document will skip to the next approver.`)) return
    doAction(() => nfaService.markLeave(id, key), 'Signatory marked on leave — document advanced')
  }

  // Steps for signing progress timeline
  const STEPS = [
    sigShown('gm')        && { key: 'gm',        label: sigLabel('gm'),        who: nfa.gmSignedBy,        at: nfa.gmSignedAt,        sig: nfa.gmSignature,        onLeave: leaves.gm },
    sigShown('user')      && { key: 'user',      label: sigLabel('user'),      who: nfa.userSignedBy,      at: nfa.userSignedAt,      sig: nfa.userSignature,      onLeave: leaves.user },
    sigShown('cfo')       && { key: 'cfo',       label: sigLabel('cfo'),       who: nfa.cfoSignedBy,       at: nfa.cfoSignedAt,       sig: nfa.cfoSignature,       onLeave: leaves.cfo },
    sigShown('president') && { key: 'president', label: sigLabel('president'), who: nfa.presidentSignedBy, at: nfa.presidentSignedAt, sig: nfa.presidentSignature, onLeave: leaves.president },
    sigShown('dir')       && { key: 'dir',       label: sigLabel('dir'),       who: nfa.dirSignedBy,       at: nfa.dirSignedAt,       sig: nfa.dirSignature,       onLeave: leaves.dir },
    { key: 'md', label: 'MD Approval', who: nfa.mdApprovedBy, at: nfa.mdApprovedAt, sig: nfa.mdSignature },
  ].filter(Boolean)

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
          .no-print { display: none !important; }
          .xl-input { border: none !important; outline: none !important; background: transparent !important; padding: 0 !important; font-family: Arial, Helvetica, sans-serif !important; }
          textarea.xl-input { resize: none !important; }
        }
        .xl-input {
          border: none;
          background: transparent;
          outline: none;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          line-height: 1.5;
          padding: 0 3px;
          box-sizing: border-box;
          width: 100%;
        }
        .xl-input:focus {
          background: #e8f0fe;
          outline: 2px solid #1a73e8;
          outline-offset: -1px;
          border-radius: 2px;
        }
        .xl-input:hover:not(:focus) { background: #f1f5f9; }
        textarea.xl-input { resize: vertical; }
        .xl-row:hover { background: rgba(66,133,244,0.04); cursor: cell; }
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
            {isNFASheet && isDirty && (
              <button onClick={saveNFA} disabled={saving} className="btn-primary flex items-center gap-2">
                <Save size={14}/> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
            {isNFASheet && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                ✏️ Click any field to edit
              </span>
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
                const onLeave = !!step.onLeave
                const isMdStep = i === STEPS.length - 1
                const isPending = !done && !onLeave && currentPendingKey === step.key
                const modeLabel = isMdStep && nfa.mdApprovalMode && nfa.mdApprovalMode !== 'DIGITAL'
                  ? APPROVAL_MODE_LABEL[nfa.mdApprovalMode]
                  : null
                return (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
                        ${done ? 'bg-green-500 border-green-500 text-white'
                          : onLeave ? 'bg-amber-400 border-amber-400 text-white'
                          : 'bg-white border-gray-300 text-gray-400'}`}>
                        {done ? '✓' : onLeave ? <Plane size={12}/> : i + 1}
                      </div>
                      <div className="text-center mt-1" style={{ minWidth: '80px' }}>
                        <p className={`text-xs font-medium ${done ? 'text-green-700' : onLeave ? 'text-amber-600' : 'text-gray-400'}`}>{step.label}</p>
                        {onLeave && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">ON LEAVE</span>}
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
                        {isPending && isPurchaseHOD && (
                          <button
                            onClick={() => handleMarkLeave(step.key)}
                            disabled={actionLoading}
                            className="mt-1 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            <Plane size={10}/> On Leave
                          </button>
                        )}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${done || onLeave ? 'bg-green-400' : 'bg-gray-200'}`} />
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
          <div style={{ borderBottom: '1px solid #ccc', display: 'flex' }} className={isNFASheet ? 'xl-row' : ''}>
            <div style={{ flex: 3, borderRight: '1px solid #ccc', padding: '5px 16px', display: 'flex' }}>
              <div style={{ fontWeight: '600', flexShrink: 0, width: '150px' }}>Project / Site Name:</div>
              <div>{projectSite || '—'}</div>
            </div>
            <div style={{ flex: 2, padding: '5px 16px' }}>
              <div style={{ display: 'flex', marginBottom: '2px' }}>
                <div style={{ fontWeight: '600', flexShrink: 0, width: '60px' }}>Make:</div>
                {isNFASheet
                  ? <XCell value={editNFA.make} onChange={v => upd('make', v)} placeholder="Make / Brand" style={{flex:1}}/>
                  : <div>{nfa.make || '—'}</div>}
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ fontWeight: '600', flexShrink: 0, width: '90px', fontSize: '11px' }}>Area of Use:</div>
                {isNFASheet
                  ? <XCell value={editNFA.areaOfUse} onChange={v => upd('areaOfUse', v)} placeholder="Area of use" style={{flex:1, fontSize:'11px'}}/>
                  : <div style={{ fontSize: '11px' }}>{nfa.areaOfUse || '—'}</div>}
              </div>
            </div>
          </div>

          {/* Supplier */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px', display: 'flex' }} className={isNFASheet ? 'xl-row' : ''}>
            <div style={{ width: '220px', fontWeight: '600', flexShrink: 0 }}>Name of Dealer / Supplier:</div>
            {isNFASheet
              ? <select value={editNFA.selectedSupplierId} onChange={e => upd('selectedSupplierId', e.target.value)} className="xl-input" style={{cursor:'pointer'}}>
                  <option value="">— select supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                </select>
              : <div>M/s {nfa.selectedSupplier?.supplierName || '—'}</div>}
          </div>

          {/* Nature of Work */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }} className={isNFASheet ? 'xl-row' : ''}>
            <span style={{ fontWeight: '600' }}>Nature of Work: </span>
            {isNFASheet
              ? <XCell value={editNFA.natureOfWork} onChange={v => upd('natureOfWork', v)} placeholder="Nature of work…" style={{width:'75%'}}/>
              : <span>{nfa.natureOfWork || '—'}</span>}
          </div>

          {/* Product Description */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }} className={isNFASheet ? 'xl-row' : ''}>
            <span style={{ fontWeight: '600' }}>Product Description / Make: </span>
            {isNFASheet
              ? <XCell value={editNFA.productDescription} onChange={v => upd('productDescription', v)} placeholder="Product description…" style={{width:'70%'}}/>
              : <span>{nfa.productDescription || '—'}</span>}
          </div>

          {/* Item Description */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
            <div style={{ fontWeight: '600', marginBottom: isNFASheet ? '4px' : 0 }}>Item Description:</div>
            {isNFASheet
              ? <XCell value={editNFA.itemDescription} onChange={v => upd('itemDescription', v)} placeholder="Describe items…" rows={4} style={{width:'100%', marginTop:'2px'}}/>
              : <span style={{ whiteSpace: 'pre-line' }}>{nfa.itemDescription || '—'}</span>}
          </div>

          {/* Amount Table */}
          {isNFASheet ? (
            <>
              {[
                { label: 'Amount Payable', field: 'baseAmount', prefix: 'Rs. ' },
                { label: 'Total',          field: null,          prefix: 'Rs. ', readVal: `Rs. ${fmtAmt(editNFA.baseAmount)}` },
                { label: 'Cartage',        field: 'cartage',     prefix: '' },
                { label: `GST %`,          field: 'gstPercent',  prefix: '', suffix: '%', type:'number' },
                { label: 'GST Amount',     field: null,          prefix: 'Rs. ', readVal: `Rs. ${fmtAmt(editNFA.gstAmount)}` },
                { label: 'Grand Total',    field: null,          prefix: 'Rs. ', readVal: `Rs. ${fmtAmt(editNFA.totalAmount)}`, bold: true },
              ].map(({ label, field, prefix, suffix, type, readVal, bold }) => (
                <div key={label} style={{ display: 'flex', borderBottom: '1px solid #ccc' }} className="xl-row">
                  <div style={{ flex: 1, padding: '4px 16px', fontWeight: bold ? 'bold' : 'normal', borderRight: '1px solid #ccc' }}>{label}</div>
                  <div style={{ width: '200px', padding: '4px 8px 4px 16px', textAlign: 'right', fontWeight: bold ? 'bold' : 'normal', flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'2px' }}>
                    {field
                      ? <>{prefix}<XCell type={type||'text'} value={editNFA[field]} onChange={v => upd(field, v)} style={{textAlign:'right', width:type==='number'?'70px':'120px'}}/>{suffix||''}</>
                      : readVal}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { label: 'Amount Payable',                   value: `Rs. ${fmtAmt(nfa.baseAmount)}` },
                { label: 'Total',                            value: `Rs. ${fmtAmt(nfa.baseAmount)}` },
                { label: 'Cartage',                          value: nfa.cartage || 'FOR' },
                { label: `GST @ ${nfa.gstPercent ?? 0}%`,   value: `Rs. ${fmtAmt(nfa.gstAmount)}` },
                { label: 'Grand Total',                      value: `Rs. ${fmtAmt(nfa.totalAmount)}`, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label} style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
                  <div style={{ flex: 1, padding: '4px 16px', fontWeight: bold ? 'bold' : 'normal', borderRight: '1px solid #ccc' }}>{label}</div>
                  <div style={{ width: '180px', padding: '4px 16px', textAlign: 'right', fontWeight: bold ? 'bold' : 'normal', flexShrink: 0 }}>{value}</div>
                </div>
              ))}
            </>
          )}

          {/* Attachment */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }} className={isNFASheet ? 'xl-row' : ''}>
            <span style={{ fontWeight: '600' }}>Attachment: </span>
            {isNFASheet ? (
              <span style={{ display:'inline-flex', gap:'12px', alignItems:'center' }}>
                <span style={{fontSize:'12px', color:'#555'}}>Quotation Date:</span>
                <XCell type="date" value={editNFA.quotationDate} onChange={v => upd('quotationDate', v)} style={{width:'140px', fontSize:'12px'}}/>
                <span style={{fontSize:'12px', color:'#555', marginLeft:'8px'}}>Comparative Date:</span>
                <XCell type="date" value={editNFA.comparativeDate} onChange={v => upd('comparativeDate', v)} style={{width:'140px', fontSize:'12px'}}/>
              </span>
            ) : <span>{attachment || '—'}</span>}
          </div>

          {/* Payment Terms */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }} className={isNFASheet ? 'xl-row' : ''}>
            <span style={{ fontWeight: '600' }}>Payment terms: </span>
            {isNFASheet
              ? <XCell value={editNFA.paymentTerms} onChange={v => upd('paymentTerms', v)} placeholder="e.g. 100% on delivery" style={{width:'60%'}}/>
              : <span>{nfa.paymentTerms || '—'}</span>}
          </div>

          {/* Mode of Payment */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }} className={isNFASheet ? 'xl-row' : ''}>
            <span style={{ fontWeight: '600' }}>Mode of Payment Preferred: </span>
            {isNFASheet
              ? <XCell value={editNFA.modeOfPayment} onChange={v => upd('modeOfPayment', v)} placeholder="NEFT / Cheque / Cash" style={{width:'55%'}}/>
              : <span>{nfa.modeOfPayment || '—'}</span>}
          </div>

          {/* Last Purchased */}
          <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }} className={isNFASheet ? 'xl-row' : ''}>
            <span style={{ fontWeight: '600' }}>Last Purchased: </span>
            {isNFASheet
              ? <XCell value={editNFA.lastPurchased} onChange={v => upd('lastPurchased', v)} placeholder="Last purchase details…" style={{width:'65%'}}/>
              : <span>{nfa.lastPurchased || '—'}</span>}
          </div>

          {/* Note */}
          {(isNFASheet || nfa.notes) && (
            <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px' }}>
              <span style={{ fontWeight: '600' }}>Note: </span>
              {isNFASheet
                ? <XCell value={editNFA.notes} onChange={v => upd('notes', v)} placeholder="Additional notes…" style={{width:'75%'}}/>
                : <span>{nfa.notes}</span>}
            </div>
          )}

          {/* MD Notes */}
          {nfa.mdNotes && (
            <div style={{ borderBottom: '1px solid #ccc', padding: '5px 16px', backgroundColor: '#fef9c3' }}>
              <span style={{ fontWeight: '600' }}>MD Decision Notes: </span>
              <span>{nfa.mdNotes}</span>
            </div>
          )}

          {/* Signature Section — respects custom order, labels, and visibility */}
          {(() => {
            const sigData = {
              gm:        { name: nfa.gmSignedBy?.name,        at: nfa.gmSignedAt,        img: nfa.gmSignature },
              user:      { name: nfa.userSignedBy?.name,      at: nfa.userSignedAt,      img: nfa.userSignature },
              cfo:       { name: nfa.cfoSignedBy?.name,       at: nfa.cfoSignedAt,       img: nfa.cfoSignature },
              president: { name: nfa.presidentSignedBy?.name, at: nfa.presidentSignedAt, img: nfa.presidentSignature },
              dir:       { name: nfa.dirSignedBy?.name,       at: nfa.dirSignedAt,       img: nfa.dirSignature },
            }
            // Use stored order (from signatories) filtered to visible only
            const orderedKeys = (customSigs || DEFAULT_SIGNATORIES).filter(s => s.show !== false).map(s => s.key)
            const mdBox = sigBox(nfa.mdApprovedBy?.name, 'MD', nfa.mdApprovedAt, nfa.mdSignature)
            // Split into left (first half) and right (second half + MD)
            const half = Math.ceil(orderedKeys.length / 2)
            const leftKeys  = orderedKeys.slice(0, half)
            const rightKeys = orderedKeys.slice(half)
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '2px solid #000', minHeight: '110px' }}>
                <div style={{ borderRight: '1px solid #000', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {leftKeys.map(k => sigBox(sigData[k]?.name, sigLabel(k), sigData[k]?.at, sigData[k]?.img))}
                </div>
                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {rightKeys.map(k => sigBox(sigData[k]?.name, sigLabel(k), sigData[k]?.at, sigData[k]?.img))}
                  {mdBox}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default NFADetailPage
