import { Fragment, useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { comparativeService } from '../../services'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, BarChart2, CheckCircle, Printer, Star,
  ThumbsUp, MessageSquare, RefreshCw, User,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  DRAFT:           'badge badge-gray',
  HOD_RECOMMENDED: 'badge badge-blue',
  USER_VERIFIED:   'badge badge-yellow',
  FINAL_VERIFIED:  'badge badge-green',
}
const STATUS_LABEL = {
  DRAFT: 'Draft', HOD_RECOMMENDED: 'HOD Recommended',
  USER_VERIFIED: 'User Verified', FINAL_VERIFIED: 'Final Verified',
}

const fmtD = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
const fmtAmt = (v) => v != null
  ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
  : '—'

const thS  = { border:'1px solid #999', padding:'4px 5px', textAlign:'center', fontWeight:'600', fontSize:'10px', backgroundColor:'#f0f0f0' }
const tdS  = { border:'1px solid #ccc', padding:'4px 6px', textAlign:'center', fontSize:'10.5px', verticalAlign:'middle' }
const tdLS = { ...tdS, textAlign:'left' }
const tdRS = { ...tdS, textAlign:'right' }

const ROW_LABELS = [
  'Quotation Received','Company / Dealer','Rates Validity','GST',
  'Make','Warranty','Payment Terms','Freight Charges',
  'Delivery Time','Vendor Contact Details','Position of Vendors',
]

// ── Approval Action Panel ─────────────────────────────────────────────────────
const ActionPanel = ({ title, color, icon: Icon, quotations, selectedSupplierId, canChangeSupplier, onSubmit, acting }) => {
  const [notes, setNotes]           = useState('')
  const [chosenSupId, setChosenSupId] = useState('')

  const effectiveSupplierId = chosenSupId || selectedSupplierId
  const selectedSup = quotations.find(q => q.supplierId === effectiveSupplierId)

  const colorMap = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   btn: 'bg-blue-700 hover:bg-blue-800',   text: 'text-blue-700' },
    teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   btn: 'bg-teal-700 hover:bg-teal-800',   text: 'text-teal-700' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', btn: 'bg-indigo-700 hover:bg-indigo-800', text: 'text-indigo-700' },
  }
  const c = colorMap[color] || colorMap.blue

  return (
    <div className={`rounded-xl border-2 ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className={c.text} />
        <p className={`font-semibold text-sm ${c.text}`}>{title}</p>
      </div>

      {/* Supplier change (optional) */}
      {canChangeSupplier && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {chosenSupId ? 'Supplier changed to:' : `Current selection: ${selectedSup?.supplier?.supplierName || '—'}`}
          </p>
          <select
            value={chosenSupId}
            onChange={e => setChosenSupId(e.target.value)}
            className="input py-1.5 text-sm w-full"
          >
            <option value="">— Keep current selection —</option>
            {quotations.map(q => (
              <option key={q.id} value={q.supplierId}>
                {q.supplier?.supplierName}
                {q.totalAmount != null ? ` — ₹${fmtAmt(q.totalAmount)}` : ''}
                {q.supplierId === selectedSupplierId ? ' (current)' : ''}
              </option>
            ))}
          </select>
          {chosenSupId && chosenSupId !== selectedSupplierId && (
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <RefreshCw size={11} /> Supplier will be changed to: <strong>{quotations.find(q=>q.supplierId===chosenSupId)?.supplier?.supplierName}</strong>
            </p>
          )}
        </div>
      )}

      {/* Reason/notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <MessageSquare size={11} /> Reason / Note (required)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Kyu recommend/verify kar rahe hain? Supplier select karne ka reason..."
          className="input text-sm w-full resize-none"
        />
      </div>

      <button
        onClick={() => {
          if (!notes.trim()) { toast.error('Reason/note required'); return }
          onSubmit(notes.trim(), chosenSupId || null)
        }}
        disabled={acting}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${c.btn}`}
      >
        <CheckCircle size={14} /> Confirm &amp; Submit
      </button>
    </div>
  )
}

// ── Approval Trail Entry ──────────────────────────────────────────────────────
const TrailEntry = ({ step, name, date, notes, done, color }) => {
  const c = done ? color : 'border-gray-200 bg-gray-50'
  return (
    <div className={`rounded-lg border p-3 ${done ? c : 'border-gray-200 bg-gray-50 opacity-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {done
            ? <CheckCircle size={14} className="text-green-600 shrink-0" />
            : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" />
          }
          <span className="text-xs font-semibold text-gray-700">{step}</span>
        </div>
        {date && <span className="text-xs text-gray-400">{fmtD(date)}</span>}
      </div>
      {name  && <p className="text-xs text-gray-600 mt-1 ml-5 flex items-center gap-1"><User size={10}/> {name}</p>}
      {notes && <p className="text-xs text-gray-500 mt-1 ml-5 italic">"{notes}"</p>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const ComparativeDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cs, setCS]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)

  const isPurchaseHOD = ['PURCHASE_HOD','GM_PURCHASE','ADMIN'].includes(user?.role)
  const isUserHOD     = ['USER_HOD','ADMIN'].includes(user?.role)
  const isPresident   = ['PRESIDENT_PROJECTS','ADMIN'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await comparativeService.getById(id)
      setCS(data.data)
    } catch { toast.error('Not found'); navigate('/comparative') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const doAction = async (fn, msg) => {
    setActing(true)
    try { await fn(); toast.success(msg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActing(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
  if (!cs) return null

  const quotations = cs.quotations || []
  const items      = cs.items      || []

  const sortedByAmt = [...quotations].filter(q=>q.totalAmount!=null).sort((a,b)=>a.totalAmount-b.totalAmount)
  const getPosition = (q) => { const i=sortedByAmt.findIndex(s=>s.id===q.id); return i>=0?`L${i+1}`:'—' }

  const getRate     = (item,idx) => [item.supplier1Rate,item.supplier2Rate,item.supplier3Rate][idx]??null
  const getItemAmt  = (item,idx) => { const r=getRate(item,idx); return r!=null?item.qty*r:null }
  const getColTotal = (idx) => items.reduce((s,item)=>s+(getItemAmt(item,idx)??0),0)

  const titleItems = items.slice(0,2).map(i=>i.material?.materialName).filter(Boolean).join(', ')
  const titleSite  = [cs.indent?.project?.projectName,cs.indent?.site?.siteName].filter(Boolean).join(', ')

  const getRowValue = (label,q) => {
    switch(label) {
      case 'Quotation Received':     return q.quotationDate?fmtD(q.quotationDate):(q.remarks||'—')
      case 'Company / Dealer':       return `M/s ${q.supplier?.supplierName||'—'}`
      case 'Vendor Contact Details': return [q.supplier?.mobile,q.supplier?.email].filter(Boolean).join(' / ')||'—'
      case 'GST':                    return q.supplier?.gstNumber?`GST: ${q.supplier.gstNumber}`:'18% Extra'
      case 'Position of Vendors':    return getPosition(q)
      default:                       return ''
    }
  }

  const supplierColor = (i) => i===0?'#dbeafe':i===1?'#dcfce7':'#fef3c7'

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #cs-print-area, #cs-print-area * { visibility: visible; }
          #cs-print-area { position: fixed; left: 0; top: 0; width: 100%; padding: 8px; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <button onClick={()=>navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15}/> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={22}/> CS — {cs.csNumber}</h1>
          <p className="page-subtitle flex items-center gap-2">
            <Link to={`/indents/${cs.indentId}`} className="text-primary-700 hover:underline">
              Indent: {cs.indent?.indentNumber}
            </Link>
            <span>·</span>
            <span className={STATUS_BADGE[cs.status]||'badge badge-gray'}>{STATUS_LABEL[cs.status]||cs.status}</span>
          </p>
        </div>
        <button onClick={()=>window.print()} className="btn-secondary flex items-center gap-2">
          <Printer size={14}/> Print CS
        </button>
      </div>

      {/* Summary */}
      <div className="card mb-4">
        <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {label:'CS Number', value:cs.csNumber},
            {label:'Indent',    value:cs.indent?.indentNumber},
            {label:'Department',value:cs.indent?.department||'—'},
            {label:'Created By',value:cs.createdBy?.name},
          ].map(({label,value})=>(
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-semibold text-sm">{value||'—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* ── Supplier Cards (left 2/3) ── */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-800">Supplier Quotations</h3>
              {cs.status==='DRAFT' && (
                <p className="text-xs text-gray-500">Ek supplier select karo phir recommend karo</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {quotations.map((q,i)=>{
                const isSelected = q.isSelected
                const pos = getPosition(q)
                return (
                  <div key={q.id} className={`p-4 flex flex-col gap-2 ${isSelected?'bg-green-50':''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{q.supplier?.supplierName}</p>
                        <p className="text-xs text-gray-400">Supplier {i+1}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        pos==='L1'?'bg-green-100 text-green-700':pos==='L2'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-600'
                      }`}>{pos}</span>
                    </div>
                    {q.totalAmount!=null && (
                      <p className={`text-lg font-bold ${isSelected?'text-green-700':'text-primary-700'}`}>
                        ₹ {fmtAmt(q.totalAmount)}
                      </p>
                    )}
                    {q.quotationDate && <p className="text-xs text-gray-400">Quot. date: {fmtD(q.quotationDate)}</p>}
                    {/* Select button only in DRAFT */}
                    {cs.status==='DRAFT' && (
                      isSelected
                        ? <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mt-auto pt-1">
                            <CheckCircle size={13}/> Selected
                          </div>
                        : <button
                            onClick={()=>doAction(()=>comparativeService.selectSupplier(id,q.supplierId),`${q.supplier?.supplierName} selected`)}
                            disabled={acting}
                            className="mt-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-primary-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                          >
                            <Star size={11}/> Select
                          </button>
                    )}
                    {cs.status!=='DRAFT' && isSelected && (
                      <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mt-auto pt-1">
                        <CheckCircle size={13}/> Selected Winner
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Approval Trail (right 1/3) ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Approval Trail</p>
          <TrailEntry
            step="Purchase HOD Recommendation"
            name={cs.hodRecommendedBy?.name}
            date={cs.hodRecommendedAt}
            notes={cs.hodNotes}
            done={!!cs.hodRecommendedAt}
            color="border-blue-200 bg-blue-50"
          />
          <TrailEntry
            step="User HOD Verification"
            name={cs.userVerifiedBy?.name}
            date={cs.userVerifiedAt}
            notes={cs.userNotes}
            done={!!cs.userVerifiedAt}
            color="border-teal-200 bg-teal-50"
          />
          <TrailEntry
            step="President Final Approval"
            name={cs.presidentVerifiedBy?.name}
            date={cs.presidentVerifiedAt}
            notes={cs.presidentNotes}
            done={!!cs.presidentVerifiedAt}
            color="border-indigo-200 bg-indigo-50"
          />
        </div>
      </div>

      {/* ── Action Panels ── */}
      {isPurchaseHOD && cs.status==='DRAFT' && (
        <div className="mb-4">
          <ActionPanel
            title="Purchase HOD — Recommend this CS"
            color="blue"
            icon={ThumbsUp}
            quotations={quotations}
            selectedSupplierId={cs.selectedSupplierId}
            canChangeSupplier={false}
            acting={acting}
            onSubmit={(notes)=>doAction(()=>comparativeService.hodRecommend(id,notes),'CS recommended')}
          />
        </div>
      )}

      {isUserHOD && cs.status==='HOD_RECOMMENDED' && (
        <div className="mb-4">
          <ActionPanel
            title="User HOD — Verify & Optionally Change Supplier"
            color="teal"
            icon={CheckCircle}
            quotations={quotations}
            selectedSupplierId={cs.selectedSupplierId}
            canChangeSupplier={true}
            acting={acting}
            onSubmit={(notes,supplierId)=>doAction(()=>comparativeService.userVerify(id,notes,supplierId),'CS user verified')}
          />
        </div>
      )}

      {isPresident && cs.status==='USER_VERIFIED' && (
        <div className="mb-4">
          <ActionPanel
            title="President — Final Approval & Optionally Change Supplier"
            color="indigo"
            icon={CheckCircle}
            quotations={quotations}
            selectedSupplierId={cs.selectedSupplierId}
            canChangeSupplier={true}
            acting={acting}
            onSubmit={(notes,supplierId)=>doAction(()=>comparativeService.presidentVerify(id,notes,supplierId),'CS finally verified')}
          />
        </div>
      )}

      {/* ── Printable CS ── */}
      <div id="cs-print-area" style={{position:'absolute',left:'-9999px',visibility:'hidden'}}>
        <div style={{fontFamily:'Arial, sans-serif',fontSize:'10px',border:'1.5px solid #000',maxWidth:'100%'}}>

          <table style={{width:'100%',borderCollapse:'collapse',borderBottom:'1.5px solid #000'}}>
            <tbody><tr>
              <td style={{padding:'6px 10px',fontWeight:'bold',fontSize:'12px'}}>
                Comparative for {titleItems||'Materials'} at {titleSite||'Head Office'}
              </td>
              <td style={{padding:'6px 10px',textAlign:'right',whiteSpace:'nowrap',fontWeight:'600',fontSize:'11px'}}>
                Date: {fmtD(cs.createdAt)}
              </td>
            </tr></tbody>
          </table>

          <table style={{width:'100%',borderCollapse:'collapse',borderBottom:'1px solid #000'}}>
            <tbody><tr>
              {[
                ['Department',cs.indent?.department||'—'],
                ['Indent Date',fmtD(cs.indent?.createdAt||cs.createdAt)],
                ['Site',cs.indent?.site?.siteName||'HO'],
                ['Indent No.',cs.indent?.indentNumber||'—'],
                ['Req Type',cs.indent?.category||'—'],
                ['Annexure','"B"'],
              ].map(([label,val])=>(
                <td key={label} style={{padding:'3px 8px',borderRight:'1px solid #ccc',fontSize:'10px',whiteSpace:'nowrap'}}>
                  <strong>{label}:</strong> {val}
                </td>
              ))}
            </tr></tbody>
          </table>

          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th rowSpan={2} style={{...thS,width:'3%'}}>Sr.<br/>No.</th>
                <th rowSpan={2} style={{...thS,width:'18%',textAlign:'left'}}>Item Description</th>
                <th rowSpan={2} style={{...thS,width:'14%',textAlign:'left'}}>Specifications</th>
                <th rowSpan={2} style={{...thS,width:'5%'}}>UOM</th>
                <th rowSpan={2} style={{...thS,width:'5%'}}>Qty</th>
                {quotations.map((q,i)=>(
                  <th key={q.id} colSpan={2} style={{...thS,backgroundColor:supplierColor(i)}}>
                    M/s {q.supplier?.supplierName||`Supplier ${i+1}`}
                  </th>
                ))}
              </tr>
              <tr>
                {quotations.map((q,i)=>(
                  <Fragment key={q.id}>
                    <th style={{...thS,backgroundColor:supplierColor(i)}}>Rate (₹)</th>
                    <th style={{...thS,backgroundColor:supplierColor(i)}}>Amount (₹)</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={item.id}>
                  <td style={tdS}>{i+1}</td>
                  <td style={tdLS}>{item.material?.materialName}</td>
                  <td style={tdLS}></td>
                  <td style={tdS}>{item.unit}</td>
                  <td style={tdS}>{item.qty}</td>
                  {quotations.map((q,qi)=>(
                    <Fragment key={q.id}>
                      <td style={tdRS}>{getRate(item,qi)!=null?fmtAmt(getRate(item,qi)):''}</td>
                      <td style={tdRS}>{getItemAmt(item,qi)!=null?fmtAmt(getItemAmt(item,qi)):''}</td>
                    </Fragment>
                  ))}
                </tr>
              ))}
              {Array.from({length:Math.max(0,3-items.length)}).map((_,i)=>(
                <tr key={`blank-${i}`}>
                  <td style={tdS}>&nbsp;</td><td style={tdLS}></td><td style={tdLS}></td>
                  <td style={tdS}></td><td style={tdS}></td>
                  {quotations.map(q=>(
                    <Fragment key={q.id}><td style={tdS}></td><td style={tdS}></td></Fragment>
                  ))}
                </tr>
              ))}
              <tr style={{backgroundColor:'#f9f9f9'}}>
                <td style={{...tdLS,fontWeight:'600'}} colSpan={5}>Total</td>
                {quotations.map((q,i)=>(
                  <Fragment key={q.id}>
                    <td style={tdS}></td>
                    <td style={{...tdRS,fontWeight:'600'}}>
                      {getColTotal(i)>0?fmtAmt(getColTotal(i)):(q.totalAmount?fmtAmt(q.totalAmount):'')}
                    </td>
                  </Fragment>
                ))}
              </tr>
              <tr>
                <td style={tdLS} colSpan={5}>Cartage</td>
                {quotations.map(q=>(<Fragment key={q.id}><td style={tdS}></td><td style={tdS}>FOR</td></Fragment>))}
              </tr>
              <tr>
                <td style={tdLS} colSpan={5}>GST 18%</td>
                {quotations.map(q=>(<Fragment key={q.id}><td style={tdS}></td><td style={tdS}></td></Fragment>))}
              </tr>
              <tr style={{backgroundColor:'#f0fdf4'}}>
                <td style={{...tdLS,fontWeight:'bold'}} colSpan={5}>Total Amount</td>
                {quotations.map((q,i)=>(
                  <Fragment key={q.id}>
                    <td style={tdS}></td>
                    <td style={{...tdRS,fontWeight:'bold'}}>
                      {q.totalAmount?fmtAmt(q.totalAmount):(getColTotal(i)>0?fmtAmt(getColTotal(i)):'')}
                    </td>
                  </Fragment>
                ))}
              </tr>
              {ROW_LABELS.map((label,ri)=>(
                <tr key={label} style={{backgroundColor:ri%2===0?'#fafafa':'#fff'}}>
                  <td style={{...tdLS,fontWeight:'600'}} colSpan={5}>{ri+8}.&nbsp;&nbsp;{label}</td>
                  {quotations.map(q=>(<td key={q.id} colSpan={2} style={tdLS}>{getRowValue(label,q)}</td>))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{borderTop:'1px solid #000',padding:'5px 10px',fontSize:'10px'}}>
            <strong>NOTE</strong>
            <table style={{width:'100%',borderCollapse:'collapse',marginTop:'3px'}}>
              <tbody>
                {['QUOTES ATTACHED', cs.notes || ''].map((note,i)=>(
                  <tr key={i}>
                    <td style={{width:'18px',padding:'1px 4px',verticalAlign:'top'}}>{i+1}.</td>
                    <td style={{padding:'1px 4px'}}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{borderTop:'1px solid #ccc',padding:'4px 10px',textAlign:'right',fontSize:'9px',color:'#666'}}>
            Printed: {new Date().toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComparativeDetailPage
