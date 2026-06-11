import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { purchasesService, suppliersService, projectsService, sitesService, materialsService, indentsService } from '../../services'
import { formatCurrency } from '../../utils/helpers'
import { Plus, Trash2, ArrowLeft, ShoppingCart, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'

const CreatePurchasePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const indentId = searchParams.get('indentId')
  const [suppliers, setSuppliers] = useState([])
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [materials, setMaterials] = useState([])
  const [linkedIndent, setLinkedIndent] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({
    defaultValues: {
      poType: 'PO',
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      transportCost: 0,
      discountAmount: 0,
      paymentTerms: '',
      advancePercent: '',
      items: [{ materialId: '', quantity: 1, rate: 0, unit: '', gstPercent: 18 }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const watchedProject = watch('projectId')

  useEffect(() => {
    Promise.all([
      suppliersService.getAll({ limit: 200 }),
      projectsService.getAll({ limit: 100 }),
      materialsService.getAll({ limit: 500 }),
    ]).then(([s, p, m]) => {
      setSuppliers(s.data.data || [])
      setProjects(p.data.data || [])
      setMaterials(m.data.data || [])
    })
  }, [])

  // Load indent if navigated from indent page
  useEffect(() => {
    if (!indentId) return
    indentsService.getById(indentId).then(({ data }) => {
      const indent = data.data
      setLinkedIndent(indent)
      if (indent.projectId) setValue('projectId', indent.projectId)
      if (indent.siteId) setValue('siteId', indent.siteId)
      setValue('indentId', indent.id)
      // Pre-fill items from indent
      const items = indent.items.map((item) => ({
        materialId: item.materialId,
        quantity: item.requestedQty,
        unit: item.unit,
        rate: 0,
        gstPercent: 18,
      }))
      if (items.length > 0) {
        items.forEach((item, idx) => {
          if (idx === 0) {
            setValue('items.0.materialId', item.materialId)
            setValue('items.0.quantity', item.quantity)
            setValue('items.0.unit', item.unit)
            setValue('items.0.gstPercent', item.gstPercent)
          }
        })
        if (items.length > 1) {
          items.slice(1).forEach((item) => append(item))
        }
      }
    }).catch(() => toast.error('Could not load indent details'))
  }, [indentId])

  useEffect(() => {
    if (watchedProject) {
      sitesService.getByProject(watchedProject).then(({ data }) => setSites(data.data || []))
    }
  }, [watchedProject])

  const handleMaterialChange = (index, materialId) => {
    const mat = materials.find((m) => m.id === materialId)
    if (mat) setValue(`items.${index}.unit`, mat.unit)
  }

  const calcSubtotal = () => {
    return (watchedItems || []).reduce((sum, item) => {
      const base = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
      const gst = base * (parseFloat(item.gstPercent) || 0) / 100
      return sum + base + gst
    }, 0)
  }

  const calcTotal = () => {
    const subtotal = calcSubtotal()
    const transport = parseFloat(watch('transportCost') || 0)
    const discount = parseFloat(watch('discountAmount') || 0)
    return subtotal + transport - discount
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (indentId) payload.indentId = indentId
      const res = await purchasesService.create(payload)
      toast.success('Purchase created successfully')
      navigate(`/purchases/${res.data.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create purchase')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24} /> New Purchase Order</h1>
          {linkedIndent && (
            <div className="flex items-center gap-2 mt-1 text-sm text-primary-700">
              <ClipboardList size={14} />
              <span>From Indent: <strong>{linkedIndent.indentNumber}</strong></span>
              {linkedIndent.purpose && <span className="text-gray-500">— {linkedIndent.purpose}</span>}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Details */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Purchase Order Details</h3></div>
          <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">PO Type *</label>
              <select {...register('poType')} className="input">
                <option value="PO">PO — Purchase Order</option>
                <option value="SPO">SPO — Standing Purchase Order</option>
                <option value="WO">WO — Work Order</option>
                <option value="ARC">ARC — Annual Rate Contract</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Supplier *</label>
              <select {...register('supplierId', { required: 'Required' })} className="input">
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
              </select>
              {errors.supplierId && <p className="error-text">{errors.supplierId.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Order Date *</label>
              <input {...register('purchaseDate', { required: 'Required' })} type="date" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Expected Delivery</label>
              <input {...register('deliveryDate')} type="date" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Project</label>
              <select {...register('projectId')} className="input">
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Site / Block</label>
              <select {...register('siteId')} className="input" disabled={!watchedProject}>
                <option value="">Select site</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Payment Terms</label>
              <input {...register('paymentTerms')} className="input" placeholder="e.g. 30 days / Advance + Balance" />
            </div>
            <div className="form-group">
              <label className="label">Advance (%)</label>
              <input {...register('advancePercent')} type="number" step="0.01" min="0" max="100" className="input" placeholder="e.g. 20" />
            </div>
            <div className="form-group">
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirm (Place Order)</option>
              </select>
            </div>
            <div className="form-group md:col-span-3">
              <label className="label">Terms & Conditions</label>
              <textarea {...register('termsConditions')} className="input" rows={2} placeholder="Special terms, delivery conditions, penalty clauses..." />
            </div>
            <div className="form-group md:col-span-3">
              <label className="label">Notes</label>
              <input {...register('notes')} className="input" placeholder="Optional notes..." />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Purchase Items</h3>
            <button type="button" onClick={() => append({ materialId: '', quantity: 1, rate: 0, unit: '', gstPercent: 18 })} className="btn-primary btn-sm">
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Material', 'Unit', 'Quantity', 'Rate (₹)', 'GST %', 'Amount', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, idx) => {
                  const item = watchedItems?.[idx] || {}
                  const base = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)
                  const gst = base * (parseFloat(item.gstPercent) || 0) / 100
                  const amount = base + gst
                  return (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <select {...register(`items.${idx}.materialId`, { required: true })} onChange={(e) => handleMaterialChange(idx, e.target.value)} className="input py-1.5 min-w-[200px]">
                          <option value="">Select material</option>
                          {materials.map((m) => <option key={m.id} value={m.id}>{m.materialName}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input {...register(`items.${idx}.unit`)} className="input py-1.5 w-20" placeholder="Unit" readOnly /></td>
                      <td className="px-3 py-2"><input {...register(`items.${idx}.quantity`, { required: true, min: 0.001 })} type="number" step="0.001" className="input py-1.5 w-24" /></td>
                      <td className="px-3 py-2"><input {...register(`items.${idx}.rate`, { required: true, min: 0 })} type="number" step="0.01" className="input py-1.5 w-28" /></td>
                      <td className="px-3 py-2"><input {...register(`items.${idx}.gstPercent`)} type="number" step="0.1" className="input py-1.5 w-20" /></td>
                      <td className="px-3 py-2 font-medium text-gray-800">{formatCurrency(amount)}</td>
                      <td className="px-3 py-2">
                        {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end p-4 border-t border-gray-100">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(calcSubtotal())}</span></div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 flex-1">Transport</span>
                <input {...register('transportCost')} type="number" step="0.01" className="input py-1 w-28 text-right" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 flex-1">Discount</span>
                <input {...register('discountAmount')} type="number" step="0.01" className="input py-1 w-28 text-right" />
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total</span><span className="text-blue-700">{formatCurrency(calcTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePurchasePage
