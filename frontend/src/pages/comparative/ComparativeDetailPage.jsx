import { Fragment, useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { comparativeService } from '../../services'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, BarChart2, CheckCircle, Printer,
  Star, ThumbsUp, MessageSquare, RefreshCw, User, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_BADGE  = { DRAFT:'badge badge-gray', HOD_RECOMMENDED:'badge badge-blue', USER_VERIFIED:'badge badge-yellow', FINAL_VERIFIED:'badge badge-green' }
const STATUS_LABEL  = { DRAFT:'Draft', HOD_RECOMMENDED:'HOD Recommended', USER_VERIFIED:'User Verified', FINAL_VERIFIED:'Final Verified' }
const SUP_BG        = ['#dbeafe','#dcfce7','#fef3c7','#fce7f3']   // blue / green / amber / pink

const fmtD = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`
}
const fmtAmt = (v) =>
  v != null ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) : '—'

/* ── inline styles for print table ────────────────────────────────────────── */
const B  = '1px solid #aaa'
const BH = '1px solid #000'
const th = (extra={}) => ({ border:B, padding:'4px 6px', textAlign:'center', fontWeight:'700', fontSize:'10px', backgroundColor:'#e8e8e8', ...extra })
const td = (extra={}) => ({ border:B, padding:'3px 6px', fontSize:'10px', verticalAlign:'middle', textAlign:'center', ...extra })

/* ── ApprovalPanel ─────────────────────────────────────────────────────────── */
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

/* ── Approval trail entry ───────────────────────────────────────────────────── */
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
  const [cs, setCS]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)

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

  const doAction = async (fn, msg) => {
    setActing(true)
    try { await fn(); toast.success(msg); load() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setActing(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
    </div>
  )
  if (!cs) return null

  const quotations = cs.quotations || []
  const items      = cs.items      || []

  const byAmt      = [...quotations].filter(q=>q.totalAmount!=null).sort((a,b)=>a.totalAmount-b.totalAmount)
  const getPos     = (q) => { const i=byAmt.findIndex(s=>s.id===q.id); return i>=0?`L${i+1}`:'—' }

  const RATE_KEYS = ['supplier1Rate','supplier2Rate','supplier3Rate','supplier4Rate']
  const getRate    = (item, qi) => item[RATE_KEYS[qi]] ?? null
  const getItemAmt = (item, qi) => { const r=getRate(item,qi); return r!=null ? item.qty*r : null }
  const getColSub  = (qi)       => items.reduce((s,item)=>s+(getItemAmt(item,qi)??0),0)

  /* supplier detail row values */
  const detailRows = [
    { num:8,  label:'Quotation Received',     fn: (q) => q.quotationRef || (q.quotationDate ? `Dated ${fmtD(q.quotationDate)}` : 'Email') },
    { num:9,  label:'Company / Dealer',       fn: (q) => `M/s ${q.supplier?.supplierName||'—'}` },
    { num:10, label:'Rates Validity',         fn: (q) => q.quotationDate ? `Quot. Dt. ${fmtD(q.quotationDate)}` : '—' },
    { num:11, label:'GST',                    fn: (q) => q.gstPercent ? `${q.gstPercent}% Extra` : '18% Extra' },
    { num:12, label:'Make',                   fn: (_) => items.length ? (items[0].specification || '—') : '—' },
    { num:13, label:'Warranty',               fn: (q) => q.warranty || '—' },
    { num:14, label:'Payment Terms',          fn: (q) => q.remarks || '100% on Delivery' },
    { num:15, label:'Freight Charges',        fn: (_) => 'FOR' },
    { num:16, label:'Delivery Time',          fn: (q) => q.deliveryDays ? `${q.deliveryDays} Days` : '—' },
    { num:17, label:'Vendor Contact Details', fn: (q) => [q.supplier?.mobile, q.supplier?.email].filter(Boolean).join(' / ') || '—' },
    { num:18, label:'Position of Vendors',    fn: (q) => getPos(q) },
  ]

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
        }
        #cs-print-area { display: block; }
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
        <button onClick={()=>window.print()} className="btn-secondary flex items-center gap-2 no-print">
          <Printer size={14}/> Print CS
        </button>
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
          <div className={`grid divide-x divide-gray-100`} style={{gridTemplateColumns:`repeat(${numQ},1fr)`}}>
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

      {/* ════════════════════════════════════════════════════════════════
          PRINTABLE COMPARATIVE DOCUMENT — visible on screen + on print
          ════════════════════════════════════════════════════════════════ */}
      <div id="cs-print-area" className="mt-2 bg-white shadow-lg rounded-lg overflow-hidden">
        {cs.status === 'DRAFT' && (
          <div className="no-print flex justify-end p-2 bg-amber-50 border-b border-amber-200">
            <Link to={`/comparative/${cs.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors">
              <Pencil size={13}/> Edit CS
            </Link>
          </div>
        )}
        <div style={{fontFamily:'Arial, sans-serif', fontSize:'10px', maxWidth:'100%'}}>

          {/* ── Title row ── */}
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

          {/* ── Info bar ── */}
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

          {/* ── Main comparison table ── */}
          <table style={{width:'100%', borderCollapse:'collapse', borderLeft:BH, borderRight:BH, borderBottom:BH}}>
            <thead>
              {/* Supplier name headers */}
              <tr>
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
                {quotations.map((q, i) => (
                  <Fragment key={q.id}>
                    <th style={th({backgroundColor:SUP_BG[i]})}>Rate (₹)</th>
                    <th style={th({backgroundColor:SUP_BG[i]})}>Amount (₹)</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Item rows */}
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td style={td()}>{i+1}</td>
                  <td style={td({textAlign:'left', fontWeight:'600'})}>{item.material?.materialName}</td>
                  <td style={td({textAlign:'left', fontSize:'9.5px'})}>{item.specification||''}</td>
                  <td style={td()}>{item.unit}</td>
                  <td style={td()}>{item.qty}</td>
                  {quotations.map((q, qi) => {
                    const r = getRate(item, qi)
                    const a = getItemAmt(item, qi)
                    return (
                      <Fragment key={q.id}>
                        <td style={td({textAlign:'right'})}>{r!=null ? fmtAmt(r) : ''}</td>
                        <td style={td({textAlign:'right'})}>{a!=null ? fmtAmt(a) : ''}</td>
                      </Fragment>
                    )
                  })}
                </tr>
              ))}

              {/* Blank padding rows */}
              {Array.from({length: Math.max(0, 3-items.length)}).map((_,i) => (
                <tr key={`b${i}`} style={{height:'20px'}}>
                  <td style={td()}>{items.length+i+1}</td>
                  <td style={td({textAlign:'left'})}></td>
                  <td style={td({textAlign:'left'})}></td>
                  <td style={td()}></td><td style={td()}></td>
                  {quotations.map(q=>(
                    <Fragment key={q.id}><td style={td()}></td><td style={td()}></td></Fragment>
                  ))}
                </tr>
              ))}

              {/* ── Total / GST / Grand Total rows ── */}
              <tr style={{backgroundColor:'#f0f0f0'}}>
                <td style={td({textAlign:'right', fontWeight:'700', fontSize:'10px'})} colSpan={5}>Total</td>
                {quotations.map((q, qi) => {
                  const sub = getColSub(qi)
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
                <td style={td({textAlign:'right'})} colSpan={5}>Cartage</td>
                {quotations.map(q => (
                  <Fragment key={q.id}><td style={td()}></td><td style={td()}>FOR</td></Fragment>
                ))}
              </tr>
              <tr>
                <td style={td({textAlign:'right'})} colSpan={5}>
                  GST {quotations[0]?.gstPercent ? `${quotations[0].gstPercent}%` : '18%'}
                </td>
                {quotations.map((q, qi) => {
                  const sub = getColSub(qi)
                  const pct = parseFloat(q.gstPercent) || 18
                  const gst = sub > 0 ? sub * pct / 100 : null
                  return (
                    <Fragment key={q.id}>
                      <td style={td()}></td>
                      <td style={td({textAlign:'right'})}>{gst ? fmtAmt(gst) : ''}</td>
                    </Fragment>
                  )
                })}
              </tr>
              <tr style={{backgroundColor:'#f0fdf4'}}>
                <td style={td({textAlign:'right', fontWeight:'700'})} colSpan={5}>Total Amount</td>
                {quotations.map((q, qi) => {
                  const sub = getColSub(qi)
                  const pct = parseFloat(q.gstPercent) || 18
                  const grand = sub > 0 ? sub + sub*pct/100 : (q.totalAmount || null)
                  return (
                    <Fragment key={q.id}>
                      <td style={td()}></td>
                      <td style={td({textAlign:'right', fontWeight:'700'})}>{grand ? fmtAmt(grand) : ''}</td>
                    </Fragment>
                  )
                })}
              </tr>

              {/* ── Supplier detail rows 8–18 ── */}
              {detailRows.map(({ num, label, fn }, ri) => (
                <tr key={num} style={{backgroundColor: ri%2===0 ? '#fafafa' : '#fff'}}>
                  <td style={td({textAlign:'left', fontWeight:'600'})} colSpan={5}>
                    {num}.&nbsp;&nbsp;{label}
                  </td>
                  {quotations.map((q, qi) => (
                    <td key={q.id} colSpan={2} style={td({
                      textAlign: num===18 ? 'center' : 'left',
                      fontWeight: num===18 ? '700' : '400',
                      fontSize: '9.5px',
                    })}>
                      {fn(q)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Notes ── */}
          <table style={{width:'100%', borderCollapse:'collapse', borderLeft:BH, borderRight:BH, borderBottom:BH}}>
            <tbody>
              <tr style={{backgroundColor:'#e8e8e8'}}>
                <td style={{padding:'3px 8px', fontWeight:'700', fontSize:'10px'}}>NOTE</td>
                <td></td>
              </tr>
              {[
                'QUOTES ATTACHED',
                cs.notes || '',
                '',
              ].map((note, i) => (
                <tr key={i}>
                  <td style={{padding:'2px 8px', fontSize:'10px', width:'24px', verticalAlign:'top', fontWeight:'500'}}>{i+1}.</td>
                  <td style={{padding:'2px 8px', fontSize:'10px', borderLeft:'1px solid #ddd'}}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div style={{padding:'4px 10px', textAlign:'right', fontSize:'9px', color:'#666', borderLeft:BH, borderRight:BH, borderBottom:BH}}>
            Generated on: {new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; CS No.: {cs.csNumber}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComparativeDetailPage
