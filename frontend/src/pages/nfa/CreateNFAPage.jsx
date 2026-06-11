import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
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

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      indentId: indentId || '',
      totalAmount: '',
      paymentTerms: '',
      advancePercent: '',
      notes: '',
    }
  })

  useEffect(() => {
    suppliersService.getAll({ limit: 200 }).then(({ data }) => setSuppliers(data.data || []))
    if (indentId) {
      indentsService.getById(indentId).then(({ data }) => setIndent(data.data))
    }
  }, [indentId])

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      const res = await nfaService.create({ ...form, indentId: indentId || form.indentId })
      toast.success(`NFA ${res.data.data.nfaNumber} created — will go through signing workflow`)
      navigate('/nfa')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create NFA')
    } finally { setSaving(false) }
  }

  const SIGNING_ORDER = [
    { role: 'GM-Purchase', label: '1. GM — Purchase' },
    { role: 'User Dept.', label: '2. User Department' },
    { role: 'CFO', label: '3. CFO' },
    { role: 'President — Projects', label: '4. President — Projects' },
    { role: 'Exe. Director', label: '5. Executive Director' },
    { role: 'MD', label: '6. MD (if required)' },
  ]

  return (
    <div className="max-w-3xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><FileCheck size={22} /> Create Note for Approval (NFA)</h1>
          {indent && (
            <p className="page-subtitle">For Indent: <strong>{indent.indentNumber}</strong> — {indent.department}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="card">
              <div className="card-header"><h3 className="font-semibold text-gray-800">NFA Details</h3></div>
              <div className="card-body space-y-4">
                <div className="form-group">
                  <label className="label">Selected Supplier</label>
                  <select {...register('selectedSupplierId')} className="input">
                    <option value="">Select vendor</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Total Amount (₹) *</label>
                  <input {...register('totalAmount', { required: 'Required' })} type="number" step="0.01" className="input" placeholder="0.00" />
                  {errors.totalAmount && <p className="error-text">{errors.totalAmount.message}</p>}
                </div>

                <div className="form-group">
                  <label className="label">Payment Terms</label>
                  <input {...register('paymentTerms')} className="input" placeholder="e.g. 30 days credit / Advance + Balance" />
                </div>

                <div className="form-group">
                  <label className="label">Advance (%)</label>
                  <input {...register('advancePercent')} type="number" step="0.01" min="0" max="100" className="input" placeholder="e.g. 20" />
                </div>

                <div className="form-group">
                  <label className="label">Notes / Justification</label>
                  <textarea {...register('notes')} className="input" rows={3} placeholder="Reason for selecting this vendor, special terms..." />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary btn-lg">
                {saving ? 'Creating NFA...' : 'Create NFA'}
              </button>
            </div>
          </form>
        </div>

        {/* Signing Order Reference */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold text-gray-800 text-sm">NFA Signing Order</h3></div>
            <div className="card-body">
              <div className="space-y-2">
                {SIGNING_ORDER.map((step) => (
                  <div key={step.role} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {step.label.charAt(0)}
                    </div>
                    <span className="text-gray-700">{step.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4">After all signatories, goes to MD for final approval (if required)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateNFAPage
