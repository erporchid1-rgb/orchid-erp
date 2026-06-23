import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { indentsService } from '../../services'
import { formatDate } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, ClipboardList, CheckCircle, XCircle, PauseCircle, Send, ShoppingCart, FileText, Printer, Pencil } from 'lucide-react'
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

const STATUS_LABEL = {
  DRAFT: 'Draft', HOD_PENDING: 'Pending HOD Review', HOD_APPROVED: 'HOD Approved',
  HOD_REJECTED: 'HOD Rejected', HOD_HOLD: 'HOD On Hold',
  PURCHASE_PENDING: 'Pending Purchase Review', PURCHASE_ACCEPTED: 'Purchase Accepted',
  PURCHASE_RETURNED: 'Returned for Clarification', PURCHASE_HOLD: 'Purchase On Hold',
  COMPARATIVE: 'Comparative In Progress', NFA: 'NFA In Progress',
  NFA_APPROVED: 'NFA Approved', PO_CREATED: 'PO Created', CLOSED: 'Closed',
}

const WorkflowStep = ({ label, status, user, date, notes }) => (
  <div className={`flex gap-3 ${status === 'active' ? 'opacity-100' : status === 'done' ? 'opacity-100' : 'opacity-40'}`}>
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
        ${status === 'done' ? 'bg-green-500' : status === 'active' ? 'bg-yellow-500' : status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'}`}>
        {status === 'done' ? '✓' : status === 'rejected' ? '✗' : '○'}
      </div>
      <div className="w-0.5 h-full bg-gray-200 mt-1" />
    </div>
    <div className="pb-4 flex-1">
      <p className="font-semibold text-gray-800 text-sm">{label}</p>
      {user && <p className="text-xs text-gray-500">By: {user}</p>}
      {date && <p className="text-xs text-gray-400">{formatDate(date)}</p>}
      {notes && <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1">{notes}</p>}
    </div>
  </div>
)

const IndentDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [indent, setIndent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const isHOD        = ['USER_HOD', 'ADMIN'].includes(user?.role)
  const isPurchaseHOD = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'].includes(user?.role)
  const isOwner      = indent?.requestedById === user?.id

  const load = () => {
    indentsService.getById(id)
      .then(({ data }) => setIndent(data.data))
      .catch(() => { toast.error('Indent not found'); navigate('/indents') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const doAction = async (fn, successMsg) => {
    setActing(true)
    try { await fn(); toast.success(successMsg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActing(false) }
  }

  const handleSubmit = () => doAction(() => indentsService.submitToHOD(id), 'Submitted to HOD')

  const handleHOD = async (action) => {
    const notes = action !== 'approve' ? window.prompt(`Reason for ${action}:`) : ''
    if (notes === null) return
    doAction(() => indentsService.hodAction(id, action, notes || ''), `Indent ${action}d`)
  }

  const handlePurchase = async (action) => {
    const notes = action !== 'accept' ? window.prompt(`Notes / reason for ${action}:`) : ''
    if (notes === null) return
    doAction(() => indentsService.purchaseAction(id, action, notes || ''), `Indent ${action}ed by Purchase HOD`)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  if (!indent) return null

  const s = indent.status

  const fmtPrint = (date) => {
    if (!date) return ''
    const d = new Date(date)
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  }

  return (
    <div className="max-w-5xl">
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
        <div className="flex items-center gap-2 flex-wrap">
          {s === 'DRAFT' && isOwner && (
            <button onClick={handleSubmit} disabled={acting} className="btn-primary btn-sm">
              <Send size={14} /> Submit to HOD
            </button>
          )}
          {isHOD && s === 'HOD_PENDING' && (
            <>
              <button onClick={() => handleHOD('approve')} disabled={acting} className="btn-success btn-sm"><CheckCircle size={14} /> Approve</button>
              <button onClick={() => handleHOD('reject')} disabled={acting} className="btn-danger btn-sm"><XCircle size={14} /> Reject</button>
              <button onClick={() => handleHOD('hold')} disabled={acting} className="btn-secondary btn-sm"><PauseCircle size={14} /> Hold</button>
            </>
          )}
          {isPurchaseHOD && s === 'PURCHASE_PENDING' && (
            <>
              <button onClick={() => handlePurchase('accept')} disabled={acting} className="btn-success btn-sm"><CheckCircle size={14} /> Accept</button>
              <button onClick={() => handlePurchase('return')} disabled={acting} className="btn-secondary btn-sm"><XCircle size={14} /> Return</button>
              <button onClick={() => handlePurchase('hold')} disabled={acting} className="btn-secondary btn-sm"><PauseCircle size={14} /> Hold</button>
            </>
          )}
          {isPurchaseHOD && s === 'PURCHASE_ACCEPTED' && (
            <Link to={`/comparative/new?indentId=${indent.id}`} className="btn btn-sm" style={{background:'#7c3aed',color:'white'}}>
              <FileText size={14} /> Create Comparative
            </Link>
          )}
          {isPurchaseHOD && ['NFA', 'COMPARATIVE'].includes(s) && (
            <Link to="/nfa/new" className="btn btn-sm" style={{background:'#4f46e5',color:'white'}}>
              <FileText size={14} /> Create NFA
            </Link>
          )}
          {isPurchaseHOD && s === 'NFA_APPROVED' && (
            <Link to={`/purchases/new?indentId=${indent.id}`} className="btn-primary btn-sm">
              <ShoppingCart size={14} /> Create PO
            </Link>
          )}
          <button onClick={() => window.print()} className="btn-secondary btn-sm flex items-center gap-1">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Status', value: <span className={STATUS_BADGE[s] || 'badge badge-gray'}>{STATUS_LABEL[s] || s}</span> },
                  { label: 'Category', value: indent.category || '—' },
                  { label: 'Department', value: indent.department || '—' },
                  { label: 'Requested By', value: indent.requestedBy?.name },
                  { label: 'Required By', value: formatDate(indent.requiredDate) },
                  { label: 'Date Raised', value: formatDate(indent.createdAt) },
                  { label: 'Project', value: indent.project?.projectName || '—' },
                  { label: 'Site / Block', value: indent.site?.siteName || '—' },
                  { label: 'Purpose', value: indent.purpose || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <div className="font-semibold text-gray-800 text-sm">{value}</div>
                  </div>
                ))}
              </div>
              {indent.storeSignature && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500">Store Signature</p><p className="font-medium">{indent.storeSignature}</p></div>
                  {indent.inchargeSignature && <div><p className="text-xs text-gray-500">In-charge Signature</p><p className="font-medium">{indent.inchargeSignature}</p></div>}
                </div>
              )}
              {indent.remarks && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Remarks</p>
                  <p className="text-sm text-gray-700">{indent.remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-800">Materials Requested</h3></div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Material</th>
                    <th>Category</th>
                    <th>UoM</th>
                    <th>Qty</th>
                    <th>Make / Spec</th>
                    <th>Last From</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {indent.items?.map((item, i) => (
                    <tr key={item.id}>
                      <td>{i + 1}</td>
                      <td className="font-medium">{item.material?.materialName}</td>
                      <td className="text-gray-500 text-xs">{item.material?.category?.name}</td>
                      <td>{item.unit}</td>
                      <td className="font-semibold">{item.requestedQty}</td>
                      <td className="text-gray-600 text-sm">{item.makeSpecifications || '—'}</td>
                      <td className="text-gray-600 text-sm">{item.lastPurchaseFrom || '—'}</td>
                      <td className="text-gray-400 text-sm">{item.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Linked docs */}
          {indent.purchases?.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-800">Linked Purchase Orders</h3></div>
              <div className="card-body space-y-2">
                {indent.purchases.map((po) => (
                  <Link key={po.id} to={`/purchases/${po.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-primary-50">
                    <span className="font-mono text-primary-700 font-semibold">{po.billNo}</span>
                    <div className="flex gap-2">
                      <span className="badge badge-gray">{po.poType}</span>
                      <span className="badge badge-blue">{po.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workflow Timeline */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="card-header"><h3 className="font-semibold text-gray-800">Approval Workflow</h3></div>
            <div className="card-body">
              <div className="relative">
                <WorkflowStep
                  label="1. Indent Raised"
                  status="done"
                  user={indent.requestedBy?.name}
                  date={indent.createdAt}
                />
                <WorkflowStep
                  label="2. Submitted to HOD"
                  status={['HOD_PENDING','HOD_APPROVED','HOD_REJECTED','HOD_HOLD','PURCHASE_PENDING','PURCHASE_ACCEPTED','PURCHASE_RETURNED','PURCHASE_HOLD','COMPARATIVE','NFA','NFA_APPROVED','PO_CREATED'].includes(s) ? 'done' : s === 'DRAFT' ? 'pending' : 'active'}
                />
                <WorkflowStep
                  label="3. HOD Review"
                  status={s === 'HOD_PENDING' ? 'active' : ['HOD_APPROVED','PURCHASE_PENDING','PURCHASE_ACCEPTED','PURCHASE_RETURNED','PURCHASE_HOLD','COMPARATIVE','NFA','NFA_APPROVED','PO_CREATED'].includes(s) ? 'done' : s === 'HOD_REJECTED' ? 'rejected' : s === 'HOD_HOLD' ? 'active' : 'pending'}
                  user={indent.hodApprovedBy?.name}
                  date={indent.hodApprovalDate}
                  notes={indent.hodApprovalNotes}
                />
                <WorkflowStep
                  label="4. Purchase HOD Review"
                  status={s === 'PURCHASE_PENDING' ? 'active' : ['PURCHASE_ACCEPTED','COMPARATIVE','NFA','NFA_APPROVED','PO_CREATED'].includes(s) ? 'done' : s === 'PURCHASE_RETURNED' ? 'rejected' : 'pending'}
                  user={indent.purchaseApprovedBy?.name}
                  date={indent.purchaseApprovalDate}
                  notes={indent.purchaseApprovalNotes}
                />
                <WorkflowStep
                  label="5. Comparative Statement"
                  status={s === 'COMPARATIVE' ? 'active' : ['NFA','NFA_APPROVED','PO_CREATED'].includes(s) ? 'done' : 'pending'}
                />
                <WorkflowStep
                  label="6. NFA Signing"
                  status={s === 'NFA' ? 'active' : ['NFA_APPROVED','PO_CREATED'].includes(s) ? 'done' : 'pending'}
                />
                <WorkflowStep
                  label="7. Purchase Order"
                  status={s === 'PO_CREATED' ? 'done' : 'pending'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #indent-print-area { visibility: visible !important; position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white; z-index: 99999; padding: 0; margin: 0; }
          #indent-print-area * { visibility: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Purchase Indent Document (visible on screen + printable) ── */}
      <div id="indent-print-area" className="mt-6 bg-white shadow-lg rounded-lg overflow-hidden">
        {indent.status === 'DRAFT' && (
          <div className="no-print flex justify-end p-2 bg-amber-50 border-b border-amber-200">
            <Link to={`/indents/${indent.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors">
              <Pencil size={13}/> Edit Indent
            </Link>
          </div>
        )}
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', border: '2px solid #000', boxSizing: 'border-box' }}>

          {/* Company Header */}
          <table style={{ width: '100%', borderBottom: '2px solid #000', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '90px', padding: '6px 8px', borderRight: '1.5px solid #000', textAlign: 'center', verticalAlign: 'middle' }}>
                  <img src="/logo.png" alt="Orchid" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                </td>
                <td style={{ padding: '6px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.5px' }}>ORCHID INFRASTRUCTURE DEVELOPERS PVT. LTD.</div>
                  <div style={{ fontSize: '10px', marginTop: '3px', color: '#333' }}>Global Arcade, Level-II, M.G. Road, Gurgaon-122002 (Haryana)</div>
                  <div style={{ fontSize: '10px', color: '#333' }}>Tel.: +91 124 459000 &nbsp;|&nbsp; Fax: 91 124 4590009</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Site Name + No */}
          <table style={{ width: '100%', borderBottom: '1px solid #000', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 10px', borderRight: '1.5px solid #000', width: '68%', fontSize: '11px' }}>
                  <strong>Site Name :</strong>&nbsp; {[indent.site?.siteName, indent.project?.projectName].filter(Boolean).join(', ')}
                </td>
                <td style={{ padding: '5px 10px', fontSize: '11px' }}>
                  <strong>No. &nbsp;&nbsp;</strong> {indent.indentNumber}
                </td>
              </tr>
              <tr style={{ borderTop: '1px solid #999' }}>
                <td style={{ padding: '5px 10px', borderRight: '1.5px solid #000', fontSize: '11px' }}>
                  <strong>Department :</strong>&nbsp; {indent.department || '—'}
                  &nbsp;&nbsp;&nbsp; <strong>Category :</strong>&nbsp; {indent.category || '—'}
                </td>
                <td style={{ padding: '5px 10px', fontSize: '11px' }}>
                  <strong>Date &nbsp;&nbsp;</strong> {fmtPrint(indent.indentDate || indent.createdAt)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Title */}
          <div style={{ textAlign: 'center', padding: '5px 10px', fontWeight: 'bold', fontSize: '14px', borderBottom: '1.5px solid #000', letterSpacing: '2px' }}>
            PURCHASE INDENT
          </div>
          {indent.purpose && (
            <div style={{ textAlign: 'center', fontSize: '11px', padding: '3px 10px', borderBottom: '1px solid #000', fontStyle: 'italic' }}>
              {indent.purpose}
            </div>
          )}

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#e8e8e8' }}>
                <th rowSpan={2} style={TH}>Sr.<br/>No.</th>
                <th rowSpan={2} style={{ ...TH, width: '26%', textAlign: 'left', paddingLeft: '6px' }}>Description / Specification</th>
                <th rowSpan={2} style={TH}>Qty.<br/>Reqd.</th>
                <th rowSpan={2} style={TH}>UOM</th>
                <th rowSpan={2} style={TH}>Delivery<br/>Required by</th>
                <th rowSpan={2} style={TH}>Supply Source<br/>if any</th>
                <th colSpan={3} style={{ ...TH, textAlign: 'center', borderBottom: '1px solid #999' }}>To be filled up by Store</th>
                <th rowSpan={2} style={TH}>Remarks</th>
              </tr>
              <tr style={{ backgroundColor: '#e8e8e8' }}>
                <th style={TH}>Stock in<br/>hand Qty</th>
                <th style={TH}>Last Purchase<br/>rate &amp; Source</th>
                <th style={TH}>PO No.<br/>&amp; Date</th>
              </tr>
            </thead>
            <tbody>
              {indent.items?.map((item, i) => (
                <tr key={item.id}>
                  <td style={{ ...TD, textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</td>
                  <td style={{ ...TD, textAlign: 'left', paddingLeft: '6px' }}>
                    <div style={{ fontWeight: '500' }}>{item.material?.materialName}</div>
                    {item.makeSpecifications && <div style={{ fontSize: '9.5px', color: '#555', marginTop: '1px' }}>({item.makeSpecifications})</div>}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: '600' }}>{item.requestedQty}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{item.unit}</td>
                  <td style={TD}></td>
                  <td style={{ ...TD, fontSize: '10px' }}>{item.lastPurchaseFrom || ''}</td>
                  <td style={TD}></td>
                  <td style={TD}></td>
                  <td style={TD}></td>
                  <td style={{ ...TD, fontSize: '10px' }}>{item.remarks || ''}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 6 - (indent.items?.length || 0)) }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  {Array.from({ length: 10 }).map((__, j) => <td key={j} style={{ ...TD, height: '22px' }}></td>)}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Remarks row if any */}
          {indent.remarks && (
            <div style={{ borderTop: '1px solid #000', padding: '4px 10px', fontSize: '10px' }}>
              <strong>Remarks:</strong> {indent.remarks}
            </div>
          )}

          {/* Notes */}
          <div style={{ borderTop: '1.5px solid #000', padding: '5px 10px', fontSize: '9.5px' }}>
            <strong>Note:</strong>
            <ol style={{ margin: '2px 0 0 16px', padding: 0, lineHeight: '1.6' }}>
              <li>Only one Category of item should be indented in one indent but different size / quality of the same item can be indent together.</li>
              <li>Reasonable lead time must be allowed, or alternatively in case of an emergency purchase, reason recorded for not allowing lead time.</li>
              <li>Where necessary, indentor must satisfy himself that budget provision exists.</li>
              <li>Proper description with complete specification. Etc to be indicated together with IS BS/DIN Iso. nos; whereever applicable.</li>
            </ol>
          </div>

          {/* Signatures */}
          <table style={{ width: '100%', borderTop: '1.5px solid #000', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 14px 10px', borderRight: '1px solid #aaa', width: '34%', verticalAlign: 'bottom' }}>
                  <div style={{ minHeight: '40px' }}></div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '10px' }}>
                    <strong>Approved by</strong>
                    {indent.hodApprovedBy?.name && <span style={{ marginLeft: '6px' }}>{indent.hodApprovedBy.name}</span>}
                    {indent.hodApprovalDate && <span style={{ marginLeft: '6px', color: '#555' }}>{fmtPrint(indent.hodApprovalDate)}</span>}
                  </div>
                </td>
                <td style={{ padding: '8px 14px 10px', borderRight: '1px solid #aaa', width: '33%', verticalAlign: 'bottom', textAlign: 'center' }}>
                  <div style={{ minHeight: '40px' }}></div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '10px' }}>
                    {indent.requestedBy?.name}
                    <div style={{ color: '#555' }}>{fmtPrint(indent.createdAt)}</div>
                  </div>
                </td>
                <td style={{ padding: '8px 14px 10px', verticalAlign: 'bottom', textAlign: 'right' }}>
                  <div style={{ minHeight: '40px' }}></div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '10px' }}>
                    <strong>Signature</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>
  )
}

const TH = {
  border: '1px solid #999',
  padding: '4px 5px',
  textAlign: 'center',
  fontWeight: '700',
  fontSize: '10px',
  lineHeight: '1.4',
}
const TD = {
  border: '1px solid #ccc',
  padding: '5px 5px',
  fontSize: '11px',
  verticalAlign: 'top',
  minHeight: '22px',
}

export default IndentDetailPage
