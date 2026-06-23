import { Fragment, useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { comparativeService, materialsService } from '../../services'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, BarChart2, CheckCircle, Printer,
  Star, ThumbsUp, MessageSquare, RefreshCw, User, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE  = { DRAFT:'badge badge-gray', HOD_RECOMMENDED:'badge badge-blue', USER_VERIFIED:'badge badge-yellow', FINAL_VERIFIED:'badge badge-green' }
const STATUS_LABEL  = { DRAFT:'Draft', HOD_RECOMMENDED:'HOD Recommended', USER_VERIFIED:'User Verified', FINAL_VERIFIED:'Final Verified' }
const SUP_BG        = ['#dbeafe','#dcfce7','#fef3c7','#fce7f3']

const fmtD = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`
}
const fmtAmt = (v) =>
  v != null ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) : '—'

const B  = '1px solid #aaa'
const BH = '1px solid #000'
const th = (extra={}) => ({ border:B, padding:'4px 6px', textAlign:'center', fontWeight:'700', fontSize:'10px', backgroundColor:'#e8e8e8', ...extra })
const td = (extra={}) => ({ border:B, padding:'3px 6px', fontSize:'10px', verticalAlign:'middle', textAlign:'center', ...extra })

/* ── Excel-like cell input ─────────────────────────────────────────────────── */
const XCell = ({ value, onChange, type='text', style={}, placeholder='' }) => (
  <input
    type={type}
    value={value ?? ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="xl-input"
    style={{ textAlign: type === 'number' ? 'right' : 'left', ...style }}
  />
)

/* ── Approval panel ─────────────────────────────────────────────────────────── */
const ActionPanel = ({ title, color, icon: Icon, quotations, selectedSupplierId, canChangeSupplier, onSubmit, acting }) => {
  const [notes, setNotes]         = useState('')
  const [chosenSup, setChosenSup] = useState('')
  const cMap = {
    blue:   { bg:'bg-blue-50',   border:'border-blue-200',   btn:'bg-blue-700 hover:bg-blue-800',    text:'text-blue-700' },
    teal:   { bg:'bg-teal-50',   border:'border-teal-200',   btn:'bg-teal-700 hover:bg-teal-800',    text:'text-teal-700' },
    indigo: { bg:'bg-indigo-50', border:'border-indigo-200', btn:'bg-indigo-700 hover:bg-indigo-800', text:'text-indigo-700' },
  }
  const c = cMap[color] || cMap.blue
  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className={c.text} />
        <p className={`font-semibold text-sm ${c.text}`}>{title}</p>
      </div>
      {canChangeSupplier && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {chosenSup ? 'Supplier changed to:' : `Current: ${quotations.find(q=>q.supplierId===selectedSupplierId)?.supplier?.supplierName||'—'}`}
          </p>
          <select value={chosenSup} onChange={e=>setChosenSup(e.target.value)} className="input py-1.5 text-sm w-full">
            <option value="">— Keep current —</option>
            {quotations.map(q=>(
              <option key={q.id} value={q.supplierId}>
                {q.supplier?.supplierName}{q.totalAmount!=null?` — ₹${fmtAmt(q.totalAmount)}`:''}
                {q.supplierId===selectedSupplierId?' (current)':''}
              </option>
            ))}
          </select>
          {chosenSup && chosenSup!==selectedSupplierId && (
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <RefreshCw size={11}/> Changing to: <strong>{quotations.find(q=>q.supplierId===chosenSup)?.supplier?.supplierName}</strong>
            </p>
          )}
        </div>
      )}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageSquare size={11}/> Reason / Note (required)</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
          placeholder="Reason for recommendation / verification..." className="input text-sm w-full resize-none" />
      </div>
      <button
        onClick={()=>{ if(!notes.trim()){toast.error('Reason required');return} onSubmit(notes.trim(),chosenSup||null) }}
        disabled={acting}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-semibold ${c.btn}`}
      >
        <CheckCircle size={14}/> Confirm &amp; Submit
      </button>
    </div>
  )
}

const TrailEntry = ({ step, name, date, notes, done, color }) => (
  <div className={`rounded-lg border p-3 ${done ? color : 'border-gray-200 bg-gray-50 opacity-50'}`}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {done ? <CheckCircle size={14} className="text-green-600 shrink-0"/> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0"/>}
        <span className="text-xs font-semibold text-gray-700">{step}</span>
      </div>
      {date && <span className="text-xs text-gray-400">{fmtD(date)}</span>}
    </div>
    {name  && <p className="text-xs text-gray-600 mt-1 ml-5 flex items-center gap-1"><User size={10}/> {name}</p>}
    {notes && <p className="text-xs text-gray-500 mt-1 ml-5 italic">"{notes}"</p>}
  </div>
)

/* ── Main ───────────────────────────────────────────────────────────────────── */
const ComparativeDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cs, setCS]           = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)
  const [saving, setSaving]   = useState(false)

  // Spreadsheet state
  const [editItems, setEditItems]       = useState([])
  const [editQuotes, setEditQuotes]     = useState([])
  const [editDetailRows, setDetailRows] = useState([])  // [{label, values:[per quote]}]
  const [materials, setMaterials]       = useState([])
  const [isDirty, setIsDirty]           = useState(false)

  const isPurchaseHOD = ['PURCHASE_HOD','GM_PURCHASE','ADMIN'].includes(user?.role)
  const isUserHOD     = ['USER_HOD','ADMIN'].includes(user?.role)
  const isPresident   = ['PRESIDENT_PROJECTS','ADMIN'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try { const { data } = await comparativeService.getById(id); setCS(data.data) }
    catch { toast.error('Not found'); navigate('/comparative') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  // When cs loads and is editable, init spreadsheet state + fetch materials
  useEffect(() => {
    if (!cs || cs.status !== 'DRAFT' || !isPurchaseHOD) return
    setEditItems((cs.items || []).map(it => ({
      id: it.id, materialId: it.materialId,
      materialName: it.material?.materialName || '',
      specification: it.specification || '',
      unit: it.unit || '',
      qty: it.qty ?? 0,
      s1: it.supplier1Rate ?? '',
      s2: it.supplier2Rate ?? '',
      s3: it.supplier3Rate ?? '',
      s4: it.supplier4Rate ?? '',
    })))
    setEditQuotes((cs.quotations || []).map(q => ({
      id: q.id, supplierId: q.supplierId,
      supplierName: q.supplier?.supplierName || '',
      quotationRef: q.quotationRef || '',
      quotationDate: q.quotationDate ? q.quotationDate.slice(0,10) : '',
      gstPercent: q.gstPercent ?? 18,
      warranty: q.warranty || '',
      deliveryDays: q.deliveryDays ?? '',
      remarks: q.remarks || '',
    })))
    // Init detail rows from saved JSON or build from quotation fields
    const qs = cs.quotations || []
    if (cs.detailRowsJson) {
      try { setDetailRows(JSON.parse(cs.detailRowsJson)) } catch { initDefaultDetailRows(qs) }
    } else {
      initDefaultDetailRows(qs)
    }
    setIsDirty(false)
    materialsService.getAll({ limit: 500 }).then(r => setMaterials(r.data.data || [])).catch(()=>{})
  }, [cs])

  const initDefaultDetailRows = (qs) => {
    const fmtDate = (d) => { if (!d) return ''; const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}` }
    setDetailRows([
      { label: 'Quotation Received',     values: qs.map(q => q.quotationRef || (q.quotationDate ? `Dated ${fmtDate(q.quotationDate)}` : 'Email')) },
      { label: 'Company / Dealer',       values: qs.map(q => `M/s ${q.supplier?.supplierName||'—'}`) },
      { label: 'Rates Validity',         values: qs.map(q => q.quotationDate ? `Quot. Dt. ${fmtDate(q.quotationDate)}` : '—') },
      { label: 'GST',                    values: qs.map(q => q.gstPercent ? `${q.gstPercent}% Extra` : '18% Extra') },
      { label: 'Make',                   values: qs.map(_ => '') },
      { label: 'Warranty',               values: qs.map(q => q.warranty || '') },
      { label: 'Payment Terms',          values: qs.map(q => q.remarks || '100% on Delivery') },
      { label: 'Freight Charges',        values: qs.map(_ => 'FOR') },
      { label: 'Delivery Time',          values: qs.map(q => q.deliveryDays ? `${q.deliveryDays} Days` : '') },
      { label: 'Vendor Contact Details', values: qs.map(q => [q.supplier?.mobile, q.supplier?.email].filter(Boolean).join(' / ') || '') },
      { label: 'Position of Vendors',    values: qs.map(_ => '') },
    ])
  }

  const updDR = (ri, field, val) => {
    setDetailRows(prev => prev.map((r, i) => i === ri
      ? (field === 'label' ? { ...r, label: val } : { ...r, values: r.values.map((v, vi) => vi === field ? val : v) })
      : r
    ))
    setIsDirty(true)
  }
  const delDR = (ri) => { setDetailRows(prev => prev.filter((_, i) => i !== ri)); setIsDirty(true) }
  const addDR = () => {
    const numQ = editQuotes.length || (cs?.quotations?.length || 0)
    setDetailRows(prev => [...prev, { label: 'New Row', values: Array(numQ).fill('') }])
    setIsDirty(true)
  }

  const doAction = async (fn, msg) => {
    setActing(true)
    try { await fn(); toast.success(msg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActing(false) }
  }

  const updI = (idx, field, val) => {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
    setIsDirty(true)
  }
  const updQ = (idx, field, val) => {
    setEditQuotes(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q))
    setIsDirty(true)
  }
  const delRow = (idx) => { setEditItems(prev => prev.filter((_, i) => i !== idx)); setIsDirty(true) }
  const addRow = () => {
    setEditItems(prev => [...prev, { id: null, materialId: '', materialName: '', specification: '', unit: 'Nos', qty: 1, s1:'', s2:'', s3:'', s4:'' }])
    setIsDirty(true)
  }

  const saveChanges = async () => {
    setSaving(true)
    try {
      await comparativeService.update(id, {
        detailRowsJson: JSON.stringify(editDetailRows),
        quotations: editQuotes.map(q => ({
          supplierId: q.supplierId,
          quotationRef: q.quotationRef,
          quotationDate: q.quotationDate || null,
          gstPercent: parseFloat(q.gstPercent) || 18,
          warranty: q.warranty,
          deliveryDays: q.deliveryDays ? parseInt(q.deliveryDays) : null,
          remarks: q.remarks,
        })),
        items: editItems.map(it => ({
          materialId: it.materialId || null,
          materialName: it.materialName,
          specification: it.specification,
          unit: it.unit,
          qty: parseFloat(it.qty) || 0,
          supplier1Rate: it.s1 !== '' ? parseFloat(it.s1) : null,
          supplier2Rate: it.s2 !== '' ? parseFloat(it.s2) : null,
          supplier3Rate: it.s3 !== '' ? parseFloat(it.s3) : null,
          supplier4Rate: it.s4 !== '' ? parseFloat(it.s4) : null,
        })),
      })
      toast.success('CS saved!')
      setIsDirty(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
    </div>
  )
  if (!cs) return null

  const isSheet = isPurchaseHOD && cs.status === 'DRAFT'
  const quotations = cs.quotations || []
  const items      = cs.items      || []

  const RATE_KEYS = ['supplier1Rate','supplier2Rate','supplier3Rate','supplier4Rate']
  const E_RATE_KEYS = ['s1','s2','s3','s4']
  const getRate    = (item, qi) => item[RATE_KEYS[qi]] ?? null
  const getItemAmt = (item, qi) => { const r=getRate(item,qi); return r!=null ? item.qty*r : null }
  const getColSub  = (qi) => items.reduce((s,it) => s + (getItemAmt(it,qi) ?? 0), 0)
  const getEditSub = (qi) => editItems.reduce((s,it) => {
    const r = it[E_RATE_KEYS[qi]] !== '' ? parseFloat(it[E_RATE_KEYS[qi]]) : null
    return s + (r != null ? parseFloat(it.qty||0) * r : 0)
  }, 0)

  const displayItems  = isSheet ? editItems  : items
  const displayQuotes = isSheet ? editQuotes : quotations

  const byAmt  = [...quotations].filter(q=>q.totalAmount!=null).sort((a,b)=>a.totalAmount-b.totalAmount)
  const getPos = (q) => { const i=byAmt.findIndex(s=>s.id===q.id); return i>=0?`L${i+1}`:'—' }

  // For read-only (non-sheet) mode: use saved custom rows or compute from quotation fields
  const detailRows = (() => {
    if (cs.detailRowsJson) {
      try {
        const saved = JSON.parse(cs.detailRowsJson)
        return saved.map(r => ({ label: r.label, fn: (q, qi) => r.values?.[qi] ?? '' }))
      } catch {}
    }
    return [
      { label:'Quotation Received',     fn: (q)    => q.quotationRef || (q.quotationDate ? `Dated ${fmtD(q.quotationDate)}` : 'Email') },
      { label:'Company / Dealer',       fn: (q)    => `M/s ${q.supplier?.supplierName||'—'}` },
      { label:'Rates Validity',         fn: (q)    => q.quotationDate ? `Quot. Dt. ${fmtD(q.quotationDate)}` : '—' },
      { label:'GST',                    fn: (q)    => q.gstPercent ? `${q.gstPercent}% Extra` : '18% Extra' },
      { label:'Make',                   fn: ()     => items.length ? (items[0].specification || '—') : '—' },
      { label:'Warranty',               fn: (q)    => q.warranty || '—' },
      { label:'Payment Terms',          fn: (q)    => q.remarks || '100% on Delivery' },
      { label:'Freight Charges',        fn: ()     => 'FOR' },
      { label:'Delivery Time',          fn: (q)    => q.deliveryDays ? `${q.deliveryDays} Days` : '—' },
      { label:'Vendor Contact Details', fn: (q)    => [q.supplier?.mobile, q.supplier?.email].filter(Boolean).join(' / ') || '—' },
      { label:'Position of Vendors',    fn: (q)    => getPos(q) },
    ]
  })()

  const titleItems = items.slice(0,2).map(i=>i.material?.materialName).filter(Boolean).join(', ')
  const titleSite  = [cs.indent?.project?.projectName, cs.indent?.site?.siteName].filter(Boolean).join(', ')
  const numQ       = quotations.length

  return (
    <div>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #cs-print-area { display: block !important; position: static !important; }
          .no-print { display: none !important; }
          .xl-input { display: none !important; }
          .xl-print { display: inline !important; }
        }
        #cs-print-area { display: block; }
        .xl-print { display: none; }

        /* Excel-like cell inputs */
        .xl-input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 10px;
          font-family: Arial, sans-serif;
          padding: 1px 3px;
          box-sizing: border-box;
          min-width: 0;
        }
        .xl-input:focus {
          background: #e8f0fe;
          outline: 2px solid #1a73e8;
          outline-offset: -1px;
          border-radius: 1px;
          position: relative;
          z-index: 1;
        }
        .xl-input:hover:not(:focus) {
          background: #f1f5f9;
        }
        .xl-row:hover td { background: rgba(66,133,244,0.04); }
        .xl-row td { cursor: cell; }
        .xl-del {
          color: #dc2626; cursor: pointer; border: none; background: none;
          padding: 0 2px; font-size: 13px; line-height: 1; opacity: 0.6;
        }
        .xl-del:hover { opacity: 1; }
        .xl-add-row td {
          padding: 3px 6px !important; border-top: 1px dashed #93c5fd !important;
          background: #f0f9ff;
        }
      `}</style>

      {/* ── Screen header ── */}
      <div className="page-header no-print">
        <div>
          <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15}/> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={22}/> CS — {cs.csNumber}</h1>
          <p className="page-subtitle flex items-center gap-2">
            <Link to={`/indents/${cs.indentId}`} className="text-primary-700 hover:underline">Indent: {cs.indent?.indentNumber}</Link>
            <span>·</span>
            <span className={STATUS_BADGE[cs.status]||'badge badge-gray'}>{STATUS_LABEL[cs.status]||cs.status}</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isSheet && isDirty && (
            <button onClick={saveChanges} disabled={saving}
              className="btn-primary flex items-center gap-2">
              <Save size={14}/> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
          {isSheet && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              ✏️ Click any cell to edit
            </span>
          )}
          <button onClick={()=>window.print()} className="btn-secondary flex items-center gap-2 no-print">
            <Printer size={14}/> Print CS
          </button>
        </div>
      </div>

      {/* ── Action panels ── */}
      {isPurchaseHOD && cs.status==='DRAFT' && (
        <div className="mb-4 no-print">
          <ActionPanel title="Purchase HOD — Recommend this CS" color="blue" icon={ThumbsUp}
            quotations={quotations} selectedSupplierId={cs.selectedSupplierId} canChangeSupplier={false}
            acting={acting} onSubmit={(notes)=>doAction(()=>comparativeService.hodRecommend(id,notes),'CS recommended')} />
        </div>
      )}
      {isUserHOD && cs.status==='HOD_RECOMMENDED' && (
        <div className="mb-4 no-print">
          <ActionPanel title="User HOD — Verify & Optionally Change Supplier" color="teal" icon={CheckCircle}
            quotations={quotations} selectedSupplierId={cs.selectedSupplierId} canChangeSupplier={true}
            acting={acting} onSubmit={(notes,sup)=>doAction(()=>comparativeService.userVerify(id,notes,sup),'CS user verified')} />
        </div>
      )}
      {isPresident && cs.status==='USER_VERIFIED' && (
        <div className="mb-4 no-print">
          <ActionPanel title="President — Final Approval" color="indigo" icon={CheckCircle}
            quotations={quotations} selectedSupplierId={cs.selectedSupplierId} canChangeSupplier={true}
            acting={acting} onSubmit={(notes,sup)=>doAction(()=>comparativeService.presidentVerify(id,notes,sup),'CS finally verified')} />
        </div>
      )}

      {/* ── Approval trail (screen only) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 no-print">
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Supplier Summary</h3>
          </div>
          <div className="grid divide-x divide-gray-100" style={{gridTemplateColumns:`repeat(${numQ},1fr)`}}>
            {quotations.map((q,i)=>{
              const pos = getPos(q)
              return (
                <div key={q.id} className={`p-4 flex flex-col gap-1.5 ${q.isSelected?'bg-green-50':''}`}>
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-gray-900 text-sm">{q.supplier?.supplierName}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pos==='L1'?'bg-green-100 text-green-700':pos==='L2'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-600'}`}>{pos}</span>
                  </div>
                  {q.totalAmount!=null && <p className={`text-xl font-bold ${q.isSelected?'text-green-700':'text-primary-700'}`}>₹ {fmtAmt(q.totalAmount)}</p>}
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {q.quotationDate && <p>Quot. date: {fmtD(q.quotationDate)}</p>}
                    {q.warranty && <p>Warranty: {q.warranty}</p>}
                    {q.deliveryDays && <p>Delivery: {q.deliveryDays} days</p>}
                  </div>
                  {cs.status==='DRAFT' && (
                    q.isSelected
                      ? <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mt-auto"><CheckCircle size={13}/> Selected</div>
                      : <button onClick={()=>doAction(()=>comparativeService.selectSupplier(id,q.supplierId),`${q.supplier?.supplierName} selected`)} disabled={acting}
                          className="mt-auto text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-primary-500 hover:text-primary-700 hover:bg-primary-50 flex items-center gap-1.5">
                          <Star size={11}/> Select
                        </button>
                  )}
                  {cs.status!=='DRAFT' && q.isSelected && (
                    <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mt-auto"><CheckCircle size={13}/> Selected Winner</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Approval Trail</p>
          <TrailEntry step="Purchase HOD Recommendation" name={cs.hodRecommendedBy?.name} date={cs.hodRecommendedAt} notes={cs.hodNotes} done={!!cs.hodRecommendedAt} color="border-blue-200 bg-blue-50"/>
          <TrailEntry step="User HOD Verification" name={cs.userVerifiedBy?.name} date={cs.userVerifiedAt} notes={cs.userNotes} done={!!cs.userVerifiedAt} color="border-teal-200 bg-teal-50"/>
          <TrailEntry step="President Final Approval" name={cs.presidentVerifiedBy?.name} date={cs.presidentVerifiedAt} notes={cs.presidentNotes} done={!!cs.presidentVerifiedAt} color="border-indigo-200 bg-indigo-50"/>
        </div>
      </div>

      {/* ════ COMPARATIVE DOCUMENT ════ */}
      <div id="cs-print-area" className="mt-2 bg-white shadow-lg rounded-lg overflow-hidden">
        <div style={{fontFamily:'Arial, sans-serif', fontSize:'10px', maxWidth:'100%'}}>

          {/* Title */}
          <table style={{width:'100%', borderCollapse:'collapse', border:BH}}>
            <tbody>
              <tr style={{backgroundColor:'#2d2d2d', color:'#fff'}}>
                <td style={{padding:'7px 12px', fontWeight:'bold', fontSize:'12px', textAlign:'center', textDecoration:'underline', letterSpacing:'0.3px'}}>
                  Comparative for Supply of {titleItems||'Materials'} at {titleSite||'Head Office'}
                </td>
                <td style={{padding:'7px 12px', whiteSpace:'nowrap', fontWeight:'600', fontSize:'11px', textAlign:'right', minWidth:'110px'}}>
                  {fmtD(cs.createdAt)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Info bar */}
          <table style={{width:'100%', borderCollapse:'collapse', borderLeft:BH, borderRight:BH, borderBottom:BH}}>
            <tbody>
              <tr>
                {[
                  ['Department', cs.indent?.department||'—'],
                  ['Indent Date', fmtD(cs.indent?.createdAt||cs.createdAt)],
                  ['Site', cs.indent?.site?.siteName||'HO'],
                  ['Indent No.', cs.indent?.indentNumber||'—'],
                  ['Req Type', cs.indent?.category||'Regular'],
                  ['Annexure', '"B"'],
                ].map(([label, val], i) => (
                  <td key={i} style={{padding:'3px 8px', borderRight:'1px solid #ccc', fontSize:'10px', whiteSpace:'nowrap'}}>
                    <strong>{label}:</strong> {val}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Main comparison table */}
          <table style={{width:'100%', borderCollapse:'collapse', borderLeft:BH, borderRight:BH, borderBottom:BH}}>
            <thead>
              <tr>
                {isSheet && <th style={th({width:'24px'})}></th>}
                <th rowSpan={2} style={th({width:'3%'})}>Sr.<br/>No.</th>
                <th rowSpan={2} style={th({width:'16%', textAlign:'left'})}>Item Description</th>
                <th rowSpan={2} style={th({width:'18%', textAlign:'left'})}>Specifications</th>
                <th rowSpan={2} style={th({width:'5%'})}>UOM</th>
                <th rowSpan={2} style={th({width:'5%'})}>Qty</th>
                {quotations.map((q, i) => (
                  <th key={q.id} colSpan={2} style={th({backgroundColor:SUP_BG[i]})}>
                    M/s {q.supplier?.supplierName||`Supplier ${i+1}`}
                  </th>
                ))}
              </tr>
              <tr>
                {isSheet && <th style={th({width:'24px'})}></th>}
                {quotations.map((q, i) => (
                  <Fragment key={q.id}>
                    <th style={th({backgroundColor:SUP_BG[i]})}>Rate (₹)</th>
                    <th style={th({backgroundColor:SUP_BG[i]})}>Amount (₹)</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, i) => {
                const rates = isSheet
                  ? [item.s1, item.s2, item.s3, item.s4].slice(0, quotations.length)
                  : quotations.map((_, qi) => getRate(item, qi))
                const qty = parseFloat(isSheet ? item.qty : item.qty) || 0
                return (
                  <tr key={item.id || i} className={isSheet ? 'xl-row' : ''}>
                    {isSheet && (
                      <td style={td({width:'24px', padding:'1px 2px', border:B})}>
                        <button className="xl-del" onClick={()=>delRow(i)} title="Delete row">×</button>
                      </td>
                    )}
                    <td style={td()}>{i+1}</td>
                    <td style={td({textAlign:'left', fontWeight:'600', padding: isSheet ? '1px' : undefined})}>
                      {isSheet
                        ? <select value={item.materialId} className="xl-input" style={{cursor:'pointer'}}
                            onChange={e => {
                              const mat = materials.find(m => m.id === e.target.value)
                              updI(i, 'materialId', e.target.value)
                              if (mat) updI(i, 'materialName', mat.materialName)
                            }}>
                            <option value="">— select —</option>
                            {materials.map(m => <option key={m.id} value={m.id}>{m.materialName}</option>)}
                          </select>
                        : item.material?.materialName}
                    </td>
                    <td style={td({textAlign:'left', fontSize:'9.5px', padding: isSheet ? '1px' : undefined})}>
                      {isSheet
                        ? <XCell value={item.specification} onChange={v=>updI(i,'specification',v)} placeholder="specification"/>
                        : item.specification||''}
                    </td>
                    <td style={td({padding: isSheet ? '1px' : undefined})}>
                      {isSheet
                        ? <XCell value={item.unit} onChange={v=>updI(i,'unit',v)} style={{textAlign:'center', width:'40px'}}/>
                        : item.unit}
                    </td>
                    <td style={td({padding: isSheet ? '1px' : undefined})}>
                      {isSheet
                        ? <XCell type="number" value={item.qty} onChange={v=>updI(i,'qty',v)} style={{width:'46px'}}/>
                        : item.qty}
                    </td>
                    {quotations.map((q, qi) => {
                      const rKey = E_RATE_KEYS[qi]
                      const r = isSheet ? (item[rKey] !== '' ? parseFloat(item[rKey]) : null) : getRate(item, qi)
                      const a = r != null ? qty * r : null
                      return (
                        <Fragment key={q.id}>
                          <td style={td({textAlign:'right', padding: isSheet ? '1px' : undefined})}>
                            {isSheet
                              ? <XCell type="number" value={item[rKey]} onChange={v=>updI(i, rKey, v)} style={{width:'70px'}}/>
                              : r!=null ? fmtAmt(r) : ''}
                          </td>
                          <td style={td({textAlign:'right'})}>{a!=null ? fmtAmt(a) : ''}</td>
                        </Fragment>
                      )
                    })}
                  </tr>
                )
              })}

              {/* Add row */}
              {isSheet && (
                <tr className="xl-add-row no-print">
                  <td colSpan={6 + quotations.length * 2}>
                    <button onClick={addRow} style={{fontSize:'10px',color:'#2563eb',cursor:'pointer',background:'none',border:'none',padding:'2px 4px',display:'flex',alignItems:'center',gap:'3px'}}>
                      <span style={{fontSize:'16px',lineHeight:1}}>+</span> Add Row
                    </button>
                  </td>
                </tr>
              )}

              {/* Blank padding rows (non-edit) */}
              {!isSheet && Array.from({length: Math.max(0, 3-items.length)}).map((_,i) => (
                <tr key={`b${i}`} style={{height:'20px'}}>
                  <td style={td()}>{items.length+i+1}</td>
                  <td style={td({textAlign:'left'})}></td><td style={td({textAlign:'left'})}></td>
                  <td style={td()}></td><td style={td()}></td>
                  {quotations.map(q=>(
                    <Fragment key={q.id}><td style={td()}></td><td style={td()}></td></Fragment>
                  ))}
                </tr>
              ))}

              {/* Totals */}
              <tr style={{backgroundColor:'#f0f0f0'}}>
                {isSheet && <td style={td()}></td>}
                <td style={td({textAlign:'right', fontWeight:'700', fontSize:'10px'})} colSpan={5}>Total</td>
                {quotations.map((q, qi) => {
                  const sub = isSheet ? getEditSub(qi) : getColSub(qi)
                  return (
                    <Fragment key={q.id}>
                      <td style={td()}></td>
                      <td style={td({textAlign:'right', fontWeight:'700'})}>
                        {sub > 0 ? fmtAmt(sub) : (q.totalAmount ? fmtAmt(q.totalAmount) : '')}
                      </td>
                    </Fragment>
                  )
                })}
              </tr>
              <tr>
                {isSheet && <td style={td()}></td>}
                <td style={td({textAlign:'right'})} colSpan={5}>Cartage</td>
                {quotations.map(q => (
                  <Fragment key={q.id}><td style={td()}></td><td style={td()}>FOR</td></Fragment>
                ))}
              </tr>
              <tr>
                {isSheet && <td style={td()}></td>}
                <td style={td({textAlign:'right'})} colSpan={5}>
                  GST {(isSheet ? editQuotes[0]?.gstPercent : quotations[0]?.gstPercent) || '18'}%
                </td>
                {displayQuotes.map((q, qi) => {
                  const sub = isSheet ? getEditSub(qi) : getColSub(qi)
                  const pct = parseFloat(q.gstPercent) || 18
                  const gst = sub > 0 ? sub * pct / 100 : null
                  return (
                    <Fragment key={q.id || qi}>
                      <td style={td()}></td>
                      <td style={td({textAlign:'right'})}>{gst ? fmtAmt(gst) : ''}</td>
                    </Fragment>
                  )
                })}
              </tr>
              <tr style={{backgroundColor:'#f0fdf4'}}>
                {isSheet && <td style={td()}></td>}
                <td style={td({textAlign:'right', fontWeight:'700'})} colSpan={5}>Total Amount</td>
                {displayQuotes.map((q, qi) => {
                  const sub = isSheet ? getEditSub(qi) : getColSub(qi)
                  const pct = parseFloat(q.gstPercent) || 18
                  const grand = sub > 0 ? sub + sub*pct/100 : (q.totalAmount || null)
                  return (
                    <Fragment key={q.id || qi}>
                      <td style={td()}></td>
                      <td style={td({textAlign:'right', fontWeight:'700'})}>{grand ? fmtAmt(grand) : ''}</td>
                    </Fragment>
                  )
                })}
              </tr>

              {/* Detail rows — dynamic, editable */}
              {(isSheet ? editDetailRows : detailRows).map((row, ri) => {
                const isLast = !isSheet && ri === detailRows.length - 1
                return (
                  <tr key={ri} className={isSheet ? 'xl-row' : ''} style={{backgroundColor: ri%2===0 ? '#fafafa' : '#fff'}}>
                    {isSheet && (
                      <td style={td({width:'24px', padding:'1px 2px'})}>
                        <button className="xl-del" onClick={()=>delDR(ri)} title="Delete row">×</button>
                      </td>
                    )}
                    <td style={td({textAlign:'left', fontWeight:'600', padding: isSheet ? '1px 2px' : undefined})} colSpan={5}>
                      {isSheet
                        ? <XCell value={row.label} onChange={v=>updDR(ri,'label',v)} style={{fontWeight:'600'}} placeholder="Row label"/>
                        : `${ri+8}.  ${row.label || ''}`}
                    </td>
                    {(isSheet ? editQuotes : quotations).map((q, qi) => {
                      const val = isSheet ? (row.values?.[qi] ?? '') : (row.fn ? row.fn(q, qi) : '')
                      return (
                        <td key={q.id || qi} colSpan={2} style={td({
                          textAlign: isLast ? 'center' : 'left',
                          fontWeight: isLast ? '700' : '400',
                          fontSize: '9.5px',
                          padding: isSheet ? '1px 2px' : undefined,
                        })}>
                          {isSheet
                            ? <XCell value={val} onChange={v=>updDR(ri, qi, v)} placeholder="value"/>
                            : val}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {/* Add detail row button */}
              {isSheet && (
                <tr className="xl-add-row no-print">
                  <td colSpan={6 + quotations.length * 2}>
                    <button onClick={addDR} style={{fontSize:'10px',color:'#7c3aed',cursor:'pointer',background:'none',border:'none',padding:'2px 4px',display:'flex',alignItems:'center',gap:'3px'}}>
                      <span style={{fontSize:'16px',lineHeight:1}}>+</span> Add Info Row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Notes */}
          <table style={{width:'100%', borderCollapse:'collapse', borderLeft:BH, borderRight:BH, borderBottom:BH}}>
            <tbody>
              <tr style={{backgroundColor:'#e8e8e8'}}>
                <td style={{padding:'3px 8px', fontWeight:'700', fontSize:'10px'}}>NOTE</td>
                <td></td>
              </tr>
              {['QUOTES ATTACHED', cs.notes || '', ''].map((note, i) => (
                <tr key={i}>
                  <td style={{padding:'2px 8px', fontSize:'10px', width:'24px', verticalAlign:'top', fontWeight:'500'}}>{i+1}.</td>
                  <td style={{padding:'2px 8px', fontSize:'10px', borderLeft:'1px solid #ddd'}}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{padding:'4px 10px', textAlign:'right', fontSize:'9px', color:'#666', borderLeft:BH, borderRight:BH, borderBottom:BH}}>
            Generated on: {new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; CS No.: {cs.csNumber}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComparativeDetailPage
