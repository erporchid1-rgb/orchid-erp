import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { nfaService, suppliersService } from '../../services'
import { FileCheck, ArrowLeft, UserCheck, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { DEFAULT_SIGNATORIES } from './CreateNFAPage'

const fmtD = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const fmt = (v) => v > 0
  ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(v)
  : '0.00'

const EditNFAPage = () => {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [nfa,         setNfa]         = useState(null)
  const [suppliers,   setSuppliers]   = useState([])
  const [signatories, setSignatories] = useState(DEFAULT_SIGNATORIES)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      memoType: 'PO_MEMO', areaOfUse: '', make: '', natureOfWork: '',
      productDescription: '', itemDescription: '', baseAmount: '',
      cartage: 'FOR', gstPercent: '18', paymentTerms: '', advancePercent: '',
      modeOfPayment: 'ONLINE', lastPurchased: '', quotationDate: '',
      comparativeDate: '', notes: '', selectedSupplierId: '',
    }
  })

  const baseAmount = parseFloat(useWatch({ control, name: 'baseAmount' })) || 0
  const gstPct     = parseFloat(useWatch({ control, name: 'gstPercent' })) || 0
  const gstAmount  = parseFloat((baseAmount * gstPct / 100).toFixed(2))
  const grandTotal = parseFloat((baseAmount + gstAmount).toFixed(2))

  useEffect(() => {
    Promise.all([
      nfaService.getById(id),
      suppliersService.getAll({ limit: 200 }),
    ]).then(([n, s]) => {
      const nfaData = n.data.data
      setNfa(nfaData)
      setSuppliers(s.data.data || [])
      if (nfaData.status !== 'DRAFT') {
        toast.error('Only DRAFT NFAs can be edited')
        navigate(`/nfa/${id}`)
        return
      }
      if (nfaData.signatories) {
        try { setSignatories(JSON.parse(nfaData.signatories)) } catch {}
      }
      reset({
        memoType:           nfaData.memoType       || 'PO_MEMO',
        areaOfUse:          nfaData.areaOfUse      || '',
        make:               nfaData.make           || '',
        natureOfWork:       nfaData.natureOfWork   || '',
        productDescription: nfaData.productDescription || '',
        itemDescription:    nfaData.itemDescription    || '',
        baseAmount:         nfaData.baseAmount     || '',
        cartage:            nfaData.cartage        || 'FOR',
        gstPercent:         nfaData.gstPercent     ?? '18',
        paymentTerms:       nfaData.paymentTerms   || '',
        advancePercent:     nfaData.advancePercent || '',
        modeOfPayment:      nfaData.modeOfPayment  || 'ONLINE',
        lastPurchased:      nfaData.lastPurchased  || '',
        quotationDate:      nfaData.quotationDate  ? fmtD(nfaData.quotationDate)  : '',
        comparativeDate:    nfaData.comparativeDate ? fmtD(nfaData.comparativeDate) : '',
        notes:              nfaData.notes          || '',
        selectedSupplierId: nfaData.selectedSupplierId || '',
      })
    }).catch(() => { toast.error('Failed to load NFA'); navigate('/nfa') })
    .finally(() => setLoading(false))
  }, [id])

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        baseAmount:      parseFloat(form.baseAmount) || 0,
        gstAmount,
        totalAmount:     grandTotal,
        gstPercent:      gstPct || null,
        advancePercent:  form.advancePercent ? parseFloat(form.advancePercent) : null,
        quotationDate:   form.quotationDate   || null,
        comparativeDate: form.comparativeDate || null,
        selectedSupplierId: form.selectedSupplierId || null,
        signatories:     JSON.stringify(signatories),
      }
      await nfaService.update(id, payload)
      toast.success('NFA updated successfully')
      navigate(`/nfa/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update NFA')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
    </div>
  )
  if (!nfa) return null

  const indent = nfa.indent || {}

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15}/> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><FileCheck size={22}/> Edit NFA — {nfa.nfaNumber}</h1>
          <p className="page-subtitle text-amber-600 font-medium">Editing DRAFT — changes will update the NFA</p>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-5 text-sm text-blue-800">
        <strong>Indent:</strong> {indent.indentNumber} &nbsp;|&nbsp;
        <strong>Project:</strong> {indent.project?.projectName || '—'} &nbsp;|&nbsp;
        <strong>Site:</strong> {indent.site?.siteName || '—'}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Section 1: Memo Type + Supplier */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">NFA Type & Supplier</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div className="col-span-2 form-group">
              <label className="label">Note for Approval — Type *</label>
              <select {...register('memoType')} className="input font-medium">
                <option value="PO_MEMO">Work / Purchase Order Memo</option>
                <option value="SITC">SITC (Site Instruction to Contractor)</option>
                <option value="AMC">AMC (Annual Maintenance Contract)</option>
                <option value="CAMC">CAMC (Comprehensive Annual Maintenance Contract)</option>
                <option value="SPO">SPO (Special Purchase Order)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Supplier / Vendor</label>
              <select {...register('selectedSupplierId')} className="input">
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Area of Use</label>
              <input {...register('areaOfUse')} className="input" placeholder="e.g. Electrical / Civil / Plumbing"/>
            </div>
            <div className="form-group">
              <label className="label">Make / Brand</label>
              <input {...register('make')} className="input" placeholder="e.g. Jindal - Panther"/>
            </div>
            <div className="form-group">
              <label className="label">Quotation Date</label>
              <input {...register('quotationDate')} type="date" className="input"/>
            </div>
            <div className="form-group">
              <label className="label">Comparative Date</label>
              <input {...register('comparativeDate')} type="date" className="input"/>
            </div>
          </div>
        </div>

        {/* Section 2: Work Description */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Work Description</h3></div>
          <div className="card-body space-y-4">
            <div className="form-group">
              <label className="label">Nature of Work *</label>
              <textarea {...register('natureOfWork', { required: 'Required' })} className="input" rows={2}
                placeholder="e.g. Supply of TMT Steel (Fe-550D) for Orchid IVY..."/>
              {errors.natureOfWork && <p className="error-text">{errors.natureOfWork.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Product Description / Make</label>
              <textarea {...register('productDescription')} className="input" rows={2}
                placeholder="e.g. TMT Steel, Make: Jindal - Panther, Grade: Fe-550 D"/>
            </div>
            <div className="form-group">
              <label className="label">Item Description</label>
              <textarea {...register('itemDescription')} className="input" rows={3}
                placeholder="Detailed item-wise description..."/>
            </div>
          </div>
        </div>

        {/* Section 3: Amount */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Amount Details</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Amount Payable (₹) *</label>
                <input {...register('baseAmount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
                  type="number" step="0.01" min="0" className="input" placeholder="0.00"/>
                {errors.baseAmount && <p className="error-text">{errors.baseAmount.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Cartage</label>
                <input {...register('cartage')} className="input" placeholder="FOR / Ex-works / Door Delivery"/>
              </div>
              <div className="form-group">
                <label className="label">GST %</label>
                <input {...register('gstPercent')} type="number" step="0.01" min="0" max="100" className="input"/>
              </div>
              <div className="form-group">
                <label className="label">GST Amount (₹)</label>
                <input value={`₹ ${fmt(gstAmount)}`} className="input bg-gray-50 text-gray-600" readOnly/>
              </div>
              <div className="form-group">
                <label className="label">Advance (%)</label>
                <input {...register('advancePercent')} type="number" step="0.01" min="0" max="100" className="input"/>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-primary-50 border border-primary-200 p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Amount Payable</span><span>₹ {fmt(baseAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>GST @ {gstPct}%</span><span>₹ {fmt(gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-primary-800 text-base border-t border-primary-200 pt-2 mt-2">
                <span>Grand Total</span><span>₹ {fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Payment */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Payment & Terms</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div className="col-span-2 form-group">
              <label className="label">Payment Terms</label>
              <input {...register('paymentTerms')} className="input" placeholder="e.g. 100% Against along with Purchase Order"/>
            </div>
            <div className="form-group">
              <label className="label">Mode of Payment</label>
              <select {...register('modeOfPayment')} className="input">
                <option value="ONLINE">Online Transfer</option>
                <option value="NEFT">NEFT / RTGS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DD">Demand Draft</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Last Purchased</label>
              <input {...register('lastPurchased')} className="input" placeholder="e.g. from M/s XYZ against PO# 058"/>
            </div>
            <div className="col-span-2 form-group">
              <label className="label">Note / Remarks</label>
              <textarea {...register('notes')} className="input" rows={2} placeholder="Additional notes..."/>
            </div>
          </div>
        </div>

        {/* Signing Authorities */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><UserCheck size={16}/> Signing Authorities</h3>
            <span className="text-xs text-gray-400">Set order, rename & toggle who signs the NFA</span>
          </div>
          <div className="card-body space-y-1.5">
            {signatories.map((s, i) => (
              <div key={s.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${s.show ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i+1}</span>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button type="button" disabled={i === 0}
                    onClick={() => setSignatories(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a })}
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronUp size={13}/>
                  </button>
                  <button type="button" disabled={i === signatories.length - 1}
                    onClick={() => setSignatories(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a })}
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronDown size={13}/>
                  </button>
                </div>
                <input type="checkbox" checked={s.show}
                  onChange={e => setSignatories(prev => prev.map((x,j) => j===i ? {...x, show: e.target.checked} : x))}
                  className="rounded border-gray-300 text-primary-600 shrink-0"/>
                <input
                  value={s.label}
                  onChange={e => setSignatories(prev => prev.map((x,j) => j===i ? {...x, label: e.target.value} : x))}
                  className={`input py-1 text-sm flex-1 ${!s.show ? 'opacity-40' : ''}`}
                  placeholder={`Signatory ${i+1} name / designation`}
                  disabled={!s.show}
                />
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 bg-gray-50 opacity-60">
              <span className="text-xs font-bold text-gray-400 w-5">{signatories.length + 1}</span>
              <div className="w-6 shrink-0"/>
              <input type="checkbox" checked disabled className="rounded border-gray-300 shrink-0"/>
              <span className="text-sm text-gray-500 flex-1 pl-1">MD Approval <span className="text-xs text-gray-400">(always last — cannot reorder)</span></span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Saving...' : 'Save NFA Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditNFAPage
