import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { nfaService, indentsService, suppliersService } from '../../services'
import { FileCheck, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const CreateNFAPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [indent, setIndent] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)

  const indentId = searchParams.get('indentId')

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    defaultValues: {
      indentId: indentId || '',
      selectedSupplierId: '',
      make: '',
      natureOfWork: '',
      productDescription: '',
      itemDescription: '',
      baseAmount: '',
      cartage: 'FOR',
      gstPercent: '18',
      paymentTerms: '',
      advancePercent: '',
      modeOfPayment: 'ONLINE',
      lastPurchased: '',
      quotationDate: '',
      comparativeDate: '',
      notes: '',
    }
  })

  const baseAmount  = parseFloat(useWatch({ control, name: 'baseAmount' }))  || 0
  const gstPercent  = parseFloat(useWatch({ control, name: 'gstPercent' }))  || 0
  const gstAmount   = parseFloat((baseAmount * gstPercent / 100).toFixed(2))
  const grandTotal  = parseFloat((baseAmount + gstAmount).toFixed(2))

  useEffect(() => {
    suppliersService.getAll({ limit: 200 }).then(({ data }) => setSuppliers(data.data || []))
    if (indentId) {
      indentsService.getById(indentId).then(({ data }) => setIndent(data.data))
    }
  }, [indentId])

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        indentId: indentId || form.indentId,
        baseAmount:  baseAmount,
        gstAmount:   gstAmount,
        totalAmount: grandTotal,
        gstPercent:  gstPercent || null,
        advancePercent: form.advancePercent ? parseFloat(form.advancePercent) : null,
        quotationDate:  form.quotationDate  || null,
        comparativeDate: form.comparativeDate || null,
        selectedSupplierId: form.selectedSupplierId || null,
        cartage: form.cartage || null,
        modeOfPayment: form.modeOfPayment || null,
      }
      const res = await nfaService.create(payload)
      toast.success(`NFA ${res.data.data.nfaNumber} created`)
      navigate('/nfa')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create NFA')
    } finally { setSaving(false) }
  }

  const formatCurrencyDisplay = (val) =>
    val > 0
      ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(val)
      : '0.00'

  const projectSite = indent
    ? [indent.project?.projectName, indent.site?.siteName].filter(Boolean).join(' — ')
    : ''

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><FileCheck size={22} /> Create Note for Approval (NFA)</h1>
          {indent && (
            <p className="page-subtitle">
              Indent: <strong>{indent.indentNumber}</strong>
              {projectSite && ` · ${projectSite}`}
              {indent.department && ` · ${indent.department}`}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Section 1: Identity ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Project & Supplier</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div className="col-span-2 form-group">
              <label className="label">Supplier / Vendor</label>
              <select {...register('selectedSupplierId')} className="input">
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.supplierName}</option>
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
                placeholder="e.g. Supply of TMT Steel (Fe-550D), Make: Jindal - Panther for Orchid IVY-2..."
              />
              {errors.natureOfWork && <p className="error-text">{errors.natureOfWork.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Product Description / Make</label>
              <textarea
                {...register('productDescription')}
                className="input" rows={2}
                placeholder="e.g. TMT Steel, Make: Jindal - Panther, Grade: Fe-550 D"
              />
            </div>

            <div className="form-group">
              <label className="label">Item Description</label>
              <textarea
                {...register('itemDescription')}
                className="input" rows={2}
                placeholder="Detailed description of items to be purchased..."
              />
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
                <input {...register('gstPercent')} type="number" step="0.01" min="0" max="100" className="input" placeholder="18" />
              </div>

              <div className="form-group">
                <label className="label">GST Amount (₹)</label>
                <input value={`₹ ${formatCurrencyDisplay(gstAmount)}`} className="input bg-gray-50 text-gray-600" readOnly />
              </div>

              <div className="form-group">
                <label className="label">Advance (%)</label>
                <input {...register('advancePercent')} type="number" step="0.01" min="0" max="100" className="input" placeholder="e.g. 20" />
              </div>
            </div>

            {/* Grand Total summary */}
            <div className="mt-4 rounded-lg bg-primary-50 border border-primary-200 p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Amount Payable</span>
                <span>₹ {formatCurrencyDisplay(baseAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>GST @ {gstPercent}%</span>
                <span>₹ {formatCurrencyDisplay(gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-primary-800 text-base border-t border-primary-200 pt-2 mt-2">
                <span>Grand Total</span>
                <span>₹ {formatCurrencyDisplay(grandTotal)}</span>
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
              <input
                {...register('paymentTerms')}
                className="input"
                placeholder="e.g. 100% Against along with Purchase Order"
              />
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
              <input
                {...register('lastPurchased')}
                className="input"
                placeholder="e.g. from M/s XYZ against PO# 058 / dt: 21-05-26 QTY -40MT"
              />
            </div>

            <div className="col-span-2 form-group">
              <label className="label">Note / Remarks</label>
              <textarea
                {...register('notes')}
                className="input" rows={2}
                placeholder="Additional justification, special notes..."
              />
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
