import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  purchasesService, suppliersService, projectsService, sitesService, materialsService,
} from '../../services'
import { formatCurrency } from '../../utils/helpers'
import { Plus, Trash2, ArrowLeft, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtD = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DEFAULT_TC = `1. GST shall be paid extra as applicable.
2. The above rates are FOR at site including Cartage, Loading etc.
3. The payment shall be made as per agreed payment terms.
4. Unloading: The above rates are inclusive of unloading charges.
5. Test Certificate shall be provided with each consignment.
6. Material will be got tested if required by the Project-in-charge.
7. Delivery: Within agreed timeline from the release of Purchase Order.
8. Important Delivery Note: Deliveries are not accepted on Saturdays & Sundays.`

const EditPurchasePage = () => {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [po,        setPo]        = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [projects,  setProjects]  = useState([])
  const [sites,     setSites]     = useState([])
  const [materials, setMaterials] = useState([])

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      poType: 'PO', purchaseDate: '', status: 'DRAFT',
      transportCost: 0, discountAmount: 0,
      paymentTerms: '', advancePercent: '', termsConditions: DEFAULT_TC,
      items: [{ materialId: '', quantity: 1, rate: 0, unit: '', gstPercent: 18 }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems   = watch('items')
  const watchedProject = watch('projectId')

  useEffect(() => {
    Promise.all([
      purchasesService.getById(id),
      suppliersService.getAll({ limit: 200 }),
      projectsService.getAll({ limit: 100 }),
      materialsService.getAll({ limit: 500 }),
    ]).then(([poRes, s, p, m]) => {
      const poData = poRes.data.data
      setPo(poData)
      setSuppliers(s.data.data || [])
      setProjects(p.data.data  || [])
      setMaterials(m.data.data || [])
      if (poData.status !== 'DRAFT') {
        toast.error('Only DRAFT Purchase Orders can be edited')
        navigate(`/purchases/${id}`)
        return
      }
      reset({
        poType:          poData.poType          || 'PO',
        purchaseDate:    fmtD(poData.purchaseDate),
        deliveryDate:    poData.deliveryDate ? fmtD(poData.deliveryDate) : '',
        status:          poData.status          || 'DRAFT',
        supplierId:      poData.supplierId       || '',
        projectId:       poData.project?.id     || '',
        siteId:          poData.site?.id         || '',
        nfaId:           poData.nfaId            || '',
        indentId:        poData.indentId         || '',
        paymentTerms:    poData.paymentTerms     || '',
        advancePercent:  poData.advancePercent   ? String(poData.advancePercent) : '',
        transportCost:   poData.transportCost    || 0,
        discountAmount:  poData.discountAmount   || 0,
        termsConditions: poData.termsConditions  || DEFAULT_TC,
        notes:           poData.notes            || '',
        refInvoiceNo:    poData.refInvoiceNo     || '',
        refInvoiceDate:  poData.refInvoiceDate ? fmtD(poData.refInvoiceDate) : '',
        attnPerson:      poData.attnPerson       || '',
        attnMobile:      poData.attnMobile       || '',
        contactPerson:   poData.contactPerson    || '',
        contactMobile:   poData.contactMobile    || '',
        items: poData.items?.map(i => ({
          materialId: i.materialId,
          quantity:   i.quantity,
          rate:       i.rate,
          unit:       i.unit || '',
          gstPercent: i.gstPercent ?? 18,
        })) || [],
      })
      if (poData.project?.id) {
        sitesService.getByProject(poData.project.id).then(({ data }) => setSites(data.data || []))
      }
    }).catch(() => { toast.error('Failed to load PO'); navigate('/purchases') })
    .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (watchedProject) {
      sitesService.getByProject(watchedProject).then(({ data }) => setSites(data.data || []))
    }
  }, [watchedProject])

  const handleMaterialChange = (index, materialId) => {
    const mat = materials.find(m => m.id === materialId)
    if (mat) setValue(`items.${index}.unit`, mat.unit)
  }

  const calcBaseTotal = () =>
    (watchedItems || []).reduce((sum, item) => sum + (parseFloat(item.quantity)||0) * (parseFloat(item.rate)||0), 0)

  const calcGSTTotal = () =>
    (watchedItems || []).reduce((sum, item) => {
      const base = (parseFloat(item.quantity)||0) * (parseFloat(item.rate)||0)
      return sum + base * (parseFloat(item.gstPercent)||0) / 100
    }, 0)

  const calcGrandTotal = () => {
    const base      = calcBaseTotal()
    const gst       = calcGSTTotal()
    const transport = parseFloat(watch('transportCost') || 0)
    const discount  = parseFloat(watch('discountAmount') || 0)
    return base + gst + transport - discount
  }

  const onSubmit = async (form) => {
    if (!form.items?.length) return toast.error('Add at least one item')
    setSaving(true)
    try {
      const payload = {
        ...form,
        refInvoiceDate: form.refInvoiceDate ? new Date(form.refInvoiceDate).toISOString() : undefined,
        advancePercent: form.advancePercent ? parseFloat(form.advancePercent) : null,
      }
      await purchasesService.update(id, payload)
      toast.success('Purchase Order updated successfully')
      navigate(`/purchases/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update PO')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
    </div>
  )
  if (!po) return null

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15}/> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24}/> Edit PO — {po.poNumber}</h1>
          <p className="page-subtitle text-amber-600 font-medium">Editing DRAFT — changes will update the purchase order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('nfaId')}/>
        <input type="hidden" {...register('indentId')}/>

        {/* PO Header */}
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
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
              </select>
              {errors.supplierId && <p className="error-text">{errors.supplierId.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Order Date *</label>
              <input {...register('purchaseDate', { required: 'Required' })} type="date" className="input"/>
              {errors.purchaseDate && <p className="error-text">{errors.purchaseDate.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Expected Delivery Date</label>
              <input {...register('deliveryDate')} type="date" className="input"/>
            </div>
            <div className="form-group">
              <label className="label">Project</label>
              <select {...register('projectId')} className="input">
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Site / Block</label>
              <select {...register('siteId')} className="input" disabled={!watchedProject}>
                <option value="">Select site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Supplier Reference */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Supplier Reference</h3></div>
          <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Ref. Invoice / Quotation No.</label>
              <input {...register('refInvoiceNo')} className="input" placeholder="e.g. PI-20"/>
            </div>
            <div className="form-group">
              <label className="label">Ref. Invoice Date</label>
              <input {...register('refInvoiceDate')} type="date" className="input"/>
            </div>
            <div className="form-group col-span-1"/>
            <div className="form-group">
              <label className="label">Kind Attn. (Person at supplier)</label>
              <input {...register('attnPerson')} className="input" placeholder="e.g. Mr. Gurmeet Singh Arora"/>
            </div>
            <div className="form-group">
              <label className="label">Attn. Mobile</label>
              <input {...register('attnMobile')} className="input" placeholder="+91 98XXXXXXXX"/>
            </div>
          </div>
        </div>

        {/* Payment & Terms */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Payment & Terms</h3></div>
          <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Payment Terms</label>
              <input {...register('paymentTerms')} className="input" placeholder="e.g. 100% advance / 30 days"/>
            </div>
            <div className="form-group">
              <label className="label">Advance (%)</label>
              <input {...register('advancePercent')} type="number" step="0.01" min="0" max="100" className="input" placeholder="e.g. 100"/>
            </div>
            <div className="form-group">
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirm (Place Order)</option>
              </select>
            </div>
            <div className="form-group md:col-span-3">
              <label className="label">Subject / Notes</label>
              <input {...register('notes')} className="input" placeholder="e.g. Order for Supply of TMT Steel Bars for Orchid Ivy..."/>
            </div>
            <div className="form-group md:col-span-3">
              <label className="label">Terms & Conditions</label>
              <textarea {...register('termsConditions')} className="input font-mono text-xs" rows={8}/>
            </div>
          </div>
        </div>

        {/* Contact Person */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Contact Person (Our Side)</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Contact Person Name</label>
              <input {...register('contactPerson')} className="input" placeholder="e.g. Mr. Ajit Shandilya"/>
            </div>
            <div className="form-group">
              <label className="label">Contact Mobile</label>
              <input {...register('contactMobile')} className="input" placeholder="+91 93XXXXXXXX"/>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Purchase Items</h3>
            <button type="button"
              onClick={() => append({ materialId: '', quantity: 1, rate: 0, unit: '', gstPercent: 18 })}
              className="btn-primary btn-sm flex items-center gap-1">
              <Plus size={14}/> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Material', 'Unit', 'Qty', 'Rate (₹ ex-GST)', 'GST %', 'Amount', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, idx) => {
                  const item = watchedItems?.[idx] || {}
                  const base   = (parseFloat(item.quantity)||0) * (parseFloat(item.rate)||0)
                  const gst    = base * (parseFloat(item.gstPercent)||0) / 100
                  const amount = base + gst
                  return (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 text-sm">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <select {...register(`items.${idx}.materialId`, { required: true })}
                          onChange={e => handleMaterialChange(idx, e.target.value)}
                          className="input py-1.5 min-w-[200px]">
                          <option value="">Select material</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.materialName}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.unit`)} className="input py-1.5 w-20" readOnly/>
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.quantity`, { required: true, min: 0.001 })}
                          type="number" step="0.001" className="input py-1.5 w-24"/>
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.rate`, { required: true, min: 0 })}
                          type="number" step="0.01" className="input py-1.5 w-28"/>
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.gstPercent`)}
                          type="number" step="0.1" className="input py-1.5 w-20"/>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800 text-sm">{formatCurrency(amount)}</td>
                      <td className="px-3 py-2">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end p-4 border-t border-gray-100">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount (ex-GST)</span>
                <span className="font-medium">{formatCurrency(calcBaseTotal())}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 flex-1">Transport / Freight</span>
                <input {...register('transportCost')} type="number" step="0.01" className="input py-1 w-28 text-right"/>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST</span>
                <span className="font-medium">{formatCurrency(calcGSTTotal())}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 flex-1">Discount</span>
                <input {...register('discountAmount')} type="number" step="0.01" className="input py-1 w-28 text-right"/>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Grand Total</span>
                <span className="text-blue-700">{formatCurrency(calcGrandTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Saving...' : 'Save PO Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditPurchasePage
