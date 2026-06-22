import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { nfaService, comparativeService } from '../../services'
import { FileCheck, ArrowLeft, CheckCircle, ChevronRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtAmt = (v) => v != null
  ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
  : '—'

const fmtD = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const CreateNFAPage = () => {
  const navigate   = useNavigate()
  const [approvedCS, setApprovedCS]     = useState([])
  const [loadingCS, setLoadingCS]       = useState(true)
  const [selectedCS, setSelectedCS]     = useState(null)
  const [saving, setSaving]             = useState(false)

  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      indentId:          '',
      csId:              '',
      selectedSupplierId:'',
      memoType:          'PO_MEMO',
      areaOfUse:         '',
      make:              '',
      natureOfWork:      '',
      productDescription:'',
      itemDescription:   '',
      baseAmount:        '',
      cartage:           'FOR',
      gstPercent:        '18',
      paymentTerms:      '',
      advancePercent:    '',
      modeOfPayment:     'ONLINE',
      lastPurchased:     '',
      quotationDate:     '',
      comparativeDate:   '',
      notes:             '',
    }
  })

  const baseAmount = parseFloat(useWatch({ control, name: 'baseAmount' })) || 0
  const gstPercent = parseFloat(useWatch({ control, name: 'gstPercent' })) || 0
  const gstAmount  = parseFloat((baseAmount * gstPercent / 100).toFixed(2))
  const grandTotal = parseFloat((baseAmount + gstAmount).toFixed(2))

  useEffect(() => {
    comparativeService.getAll({ status: 'FINAL_VERIFIED', limit: 100 })
      .then(({ data }) => setApprovedCS(data.data || []))
      .catch(() => toast.error('Failed to load approved CS'))
      .finally(() => setLoadingCS(false))
  }, [])

  // When a CS is selected, auto-fill all fields from CS data
  const handleSelectCS = (cs) => {
    setSelectedCS(cs)
    const selectedQ = cs.quotations?.find(q => q.isSelected)
    const items     = cs.items || []
    const indent    = cs.indent || {}

    // Build auto-fill values
    const natureOfWork = items.length
      ? `Supply of ${items.map(i => i.material?.materialName).filter(Boolean).join(', ')} for ${indent.project?.projectName || ''} — ${indent.site?.siteName || ''}`
      : ''

    const itemDesc = items
      .map((i, idx) => `${idx+1}. ${i.material?.materialName} — Qty: ${i.qty} ${i.unit}`)
      .join('\n')

    reset({
      indentId:           indent.id || '',
      csId:               cs.id,
      selectedSupplierId: selectedQ?.supplierId || '',
      memoType:           'PO_MEMO',
      areaOfUse:          '',
      make:               '',
      natureOfWork,
      productDescription: '',
      itemDescription:    itemDesc,
      baseAmount:         selectedQ?.totalAmount ? String(selectedQ.totalAmount) : '',
      cartage:            'FOR',
      gstPercent:         '18',
      paymentTerms:       '',
      advancePercent:     '',
      modeOfPayment:      'ONLINE',
      lastPurchased:      '',
      quotationDate:      selectedQ?.quotationDate ? fmtD(selectedQ.quotationDate) : '',
      comparativeDate:    cs.createdAt ? fmtD(cs.createdAt) : '',
      notes:              '',
    })
  }

  const onSubmit = async (form) => {
    if (!selectedCS) { toast.error('Select an approved Comparative Statement first'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        baseAmount:      parseFloat(form.baseAmount)  || 0,
        gstAmount,
        totalAmount:     grandTotal,
        gstPercent:      gstPercent || null,
        advancePercent:  form.advancePercent ? parseFloat(form.advancePercent) : null,
        quotationDate:   form.quotationDate   || null,
        comparativeDate: form.comparativeDate || null,
        selectedSupplierId: form.selectedSupplierId || null,
        cartage:         form.cartage    || null,
        modeOfPayment:   form.modeOfPayment || null,
      }
      const res = await nfaService.create(payload)
      toast.success(`NFA ${res.data.data.nfaNumber} created — signing workflow started`)
      navigate('/nfa')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create NFA')
    } finally { setSaving(false) }
  }

  const fmt = (v) => v > 0
    ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(v)
    : '0.00'

  // ── Step 1: Select CS ──────────────────────────────────────────────────────
  if (!selectedCS) {
    return (
      <div className="max-w-4xl">
        <div className="page-header">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
              <ArrowLeft size={15} /> Back
            </button>
            <h1 className="page-title flex items-center gap-2"><FileCheck size={22} /> Create NFA — Select Approved CS</h1>
            <p className="page-subtitle">Step 1 of 2 — Pick the Comparative Statement for which you are raising this NFA</p>
          </div>
        </div>

        {loadingCS ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : approvedCS.length === 0 ? (
          <div className="card p-10 text-center">
            <FileCheck size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600">No Approved Comparative Statements</p>
            <p className="text-sm text-gray-400 mt-1">
              A Comparative Statement must be Final Verified (by President) before creating an NFA.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{approvedCS.length} approved CS available:</p>
            {approvedCS.map((cs) => {
              const selectedQ = cs.quotations?.find(q => q.isSelected)
              const items     = cs.items || []
              const indent    = cs.indent || {}
              return (
                <button
                  key={cs.id}
                  onClick={() => handleSelectCS(cs)}
                  className="w-full card p-4 text-left hover:shadow-md hover:border-primary-300 border-2 border-transparent transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      {/* Top row */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-primary-700">{cs.csNumber}</span>
                        <span className="badge badge-green text-xs">Final Verified</span>
                        <span className="text-xs text-gray-400">
                          {indent.indentNumber} · {indent.department || ''}
                        </span>
                      </div>
                      {/* Project / Site */}
                      <p className="text-sm text-gray-700 font-medium">
                        {[indent.project?.projectName, indent.site?.siteName].filter(Boolean).join(' — ')}
                      </p>
                      {/* Items */}
                      {items.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Items: {items.map(i => i.material?.materialName).filter(Boolean).join(', ')}
                        </p>
                      )}
                      {/* Selected supplier */}
                      {selectedQ && (
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">Selected Supplier:</span>
                          <span className="text-sm font-semibold text-green-700">
                            {selectedQ.supplier?.supplierName}
                          </span>
                          {selectedQ.totalAmount != null && (
                            <span className="text-sm font-bold text-primary-700">
                              ₹ {fmtAmt(selectedQ.totalAmount)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-primary-500 shrink-0 transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Step 2: Fill NFA Form ──────────────────────────────────────────────────
  const indent    = selectedCS.indent || {}
  const selectedQ = selectedCS.quotations?.find(q => q.isSelected)
  const allSuppliers = selectedCS.quotations?.map(q => q.supplier).filter(Boolean) || []

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div>
          <button onClick={() => setSelectedCS(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back to CS selection
          </button>
          <h1 className="page-title flex items-center gap-2"><FileCheck size={22} /> Create NFA</h1>
          <p className="page-subtitle">Step 2 of 2 — Fill in the NFA details</p>
        </div>
      </div>

      {/* CS Summary Banner */}
      <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-5 flex items-start gap-3">
        <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-800 text-sm">
            CS: {selectedCS.csNumber} — {[indent.project?.projectName, indent.site?.siteName].filter(Boolean).join(' — ')}
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            Indent: {indent.indentNumber} · Department: {indent.department || '—'} · Selected Supplier: {selectedQ?.supplier?.supplierName || '—'}
          </p>
        </div>
        <button onClick={() => setSelectedCS(null)} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 shrink-0">
          <RefreshCw size={12} /> Change
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <input type="hidden" {...register('indentId')} />
        <input type="hidden" {...register('csId')} />

        {/* ── Section 1: Memo Type + Project & Supplier ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">NFA Type & Project</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">

            {/* Memo Type */}
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

            {/* Project / Site — read only */}
            <div className="form-group">
              <label className="label">Project</label>
              <input value={indent.project?.projectName || '—'} className="input bg-gray-50" readOnly />
            </div>
            <div className="form-group">
              <label className="label">Site / Block</label>
              <input value={indent.site?.siteName || '—'} className="input bg-gray-50" readOnly />
            </div>

            <div className="form-group">
              <label className="label">Area of Use</label>
              <input {...register('areaOfUse')} className="input" placeholder="e.g. Electrical / Civil / Plumbing" />
            </div>

            {/* Supplier — pre-selected from CS, but can change to another quoted supplier */}
            <div className="col-span-2 form-group">
              <label className="label">Supplier / Vendor</label>
              <select {...register('selectedSupplierId')} className="input">
                <option value="">Select supplier</option>
                {allSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplierName}
                    {s.id === selectedQ?.supplierId ? ' (CS selected — L1)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Make / Brand</label>
              <input {...register('make')} className="input" placeholder="e.g. Jindal - Panther" />
            </div>

            <div className="form-group">
              <label className="label">Quotation Date</label>
              <input {...register('quotationDate')} type="date" className="input" />
            </div>

            <div className="form-group">
              <label className="label">Comparative Date</label>
              <input {...register('comparativeDate')} type="date" className="input" />
            </div>
          </div>
        </div>

        {/* ── Section 2: Work Description ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Work Description</h3></div>
          <div className="card-body space-y-4">
            <div className="form-group">
              <label className="label">Nature of Work *</label>
              <textarea
                {...register('natureOfWork', { required: 'Required' })}
                className="input" rows={2}
                placeholder="e.g. Supply of TMT Steel (Fe-550D) for Orchid IVY..."
              />
              {errors.natureOfWork && <p className="error-text">{errors.natureOfWork.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Product Description / Make</label>
              <textarea {...register('productDescription')} className="input" rows={2}
                placeholder="e.g. TMT Steel, Make: Jindal - Panther, Grade: Fe-550 D" />
            </div>
            <div className="form-group">
              <label className="label">Item Description</label>
              <textarea {...register('itemDescription')} className="input" rows={3}
                placeholder="Detailed item-wise description..." />
            </div>
          </div>
        </div>

        {/* ── Section 3: Amount ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Amount Details</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Amount Payable (₹) *</label>
                <input
                  {...register('baseAmount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
                  type="number" step="0.01" min="0" className="input" placeholder="0.00"
                />
                {errors.baseAmount && <p className="error-text">{errors.baseAmount.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Cartage</label>
                <input {...register('cartage')} className="input" placeholder="FOR / Ex-works / Door Delivery" />
              </div>
              <div className="form-group">
                <label className="label">GST %</label>
                <input {...register('gstPercent')} type="number" step="0.01" min="0" max="100" className="input" />
              </div>
              <div className="form-group">
                <label className="label">GST Amount (₹)</label>
                <input value={`₹ ${fmt(gstAmount)}`} className="input bg-gray-50 text-gray-600" readOnly />
              </div>
              <div className="form-group">
                <label className="label">Advance (%)</label>
                <input {...register('advancePercent')} type="number" step="0.01" min="0" max="100" className="input" placeholder="e.g. 20" />
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-primary-50 border border-primary-200 p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Amount Payable</span><span>₹ {fmt(baseAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>GST @ {gstPercent}%</span><span>₹ {fmt(gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-primary-800 text-base border-t border-primary-200 pt-2 mt-2">
                <span>Grand Total</span><span>₹ {fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 4: Payment & Terms ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Payment & Terms</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div className="col-span-2 form-group">
              <label className="label">Payment Terms</label>
              <input {...register('paymentTerms')} className="input"
                placeholder="e.g. 100% Against along with Purchase Order" />
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
              <input {...register('lastPurchased')} className="input"
                placeholder="e.g. from M/s XYZ against PO# 058 / dt: 21-05-26 QTY-40MT" />
            </div>
            <div className="col-span-2 form-group">
              <label className="label">Note / Remarks</label>
              <textarea {...register('notes')} className="input" rows={2}
                placeholder="Additional justification, special notes..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Creating NFA...' : 'Create NFA & Start Signing Workflow'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateNFAPage
