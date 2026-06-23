import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { comparativeService, suppliersService } from '../../services'
import { BarChart2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtAmt = (v) =>
  v != null && v !== '' && !isNaN(v)
    ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
    : '—'

const COL = [
  { head: 'text-blue-600',  lborder: 'border-l-4 border-l-blue-400' },
  { head: 'text-green-600', lborder: 'border-l-4 border-l-green-400' },
  { head: 'text-amber-600', lborder: 'border-l-4 border-l-amber-400' },
  { head: 'text-rose-600',  lborder: 'border-l-4 border-l-rose-400' },
]
const RATE_KEYS = ['supplier1Rate', 'supplier2Rate', 'supplier3Rate', 'supplier4Rate']

const BLANK_QUOTATION = {
  supplierId: '', quotationRef: '', quotationDate: '',
  totalAmount: '', gstPercent: '', deliveryDays: '', warranty: '', remarks: '',
}

const EditComparativePage = () => {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [cs,        setCs]        = useState(null)
  const [suppliers, setSuppliers] = useState([])

  const { register, handleSubmit, control, reset } = useForm({
    defaultValues: {
      notes: '', poWithoutCS: false,
      quotations: [{ ...BLANK_QUOTATION }],
      items: [],
    },
  })

  const { fields: qFields, append: qAppend, remove: qRemove } = useFieldArray({ control, name: 'quotations' })
  const { fields: iFields } = useFieldArray({ control, name: 'items' })

  const watchedItems      = useWatch({ control, name: 'items' })
  const watchedQuotations = useWatch({ control, name: 'quotations' })

  const numSuppliers = Math.min(qFields.length, 4)

  const getSupplierName = (idx) => {
    const id = watchedQuotations?.[idx]?.supplierId
    if (!id) return `Supplier ${idx + 1}`
    return suppliers.find((s) => s.id === id)?.supplierName || `Supplier ${idx + 1}`
  }

  const getAmt = (itemIdx, rateKey) => {
    const item = watchedItems?.[itemIdx]
    if (!item) return null
    const qty  = parseFloat(item.qty)       || 0
    const rate = parseFloat(item[rateKey])  || 0
    return qty && rate ? qty * rate : null
  }

  const colTotal = (rateKey) =>
    (watchedItems || []).reduce((s, item) => {
      const qty  = parseFloat(item?.qty)       || 0
      const rate = parseFloat(item?.[rateKey]) || 0
      return s + qty * rate
    }, 0)

  useEffect(() => {
    Promise.all([
      comparativeService.getById(id),
      suppliersService.getAll({ limit: 200 }),
    ]).then(([csRes, sRes]) => {
      const csData = csRes.data.data
      setCs(csData)
      setSuppliers(sRes.data.data || [])
      if (csData.status !== 'DRAFT') {
        toast.error('Only DRAFT CS can be edited')
        navigate(`/comparative/${id}`)
        return
      }
      reset({
        notes:      csData.notes || '',
        poWithoutCS: csData.poWithoutCS || false,
        quotations: csData.quotations?.length
          ? csData.quotations.map(q => ({
              supplierId:    q.supplierId    || '',
              quotationRef:  q.quotationRef  || '',
              quotationDate: q.quotationDate ? q.quotationDate.split('T')[0] : '',
              totalAmount:   q.totalAmount   || '',
              gstPercent:    q.gstPercent    ?? '',
              deliveryDays:  q.deliveryDays  || '',
              warranty:      q.warranty      || '',
              remarks:       q.remarks       || '',
            }))
          : [{ ...BLANK_QUOTATION }],
        items: csData.items?.length
          ? csData.items.map(i => ({
              materialId:    i.materialId,
              qty:           i.qty,
              unit:          i.unit || '',
              specification: i.specification || '',
              supplier1Rate: i.supplier1Rate || '',
              supplier2Rate: i.supplier2Rate || '',
              supplier3Rate: i.supplier3Rate || '',
              supplier4Rate: i.supplier4Rate || '',
              selectedRate:  i.selectedRate  || '',
            }))
          : [],
      })
    }).catch(() => { toast.error('Failed to load CS'); navigate('/comparative') })
    .finally(() => setLoading(false))
  }, [id])

  const onSubmit = async (form) => {
    if (!form.quotations?.length) return toast.error('Add at least one quotation')
    if (!form.items?.length) return toast.error('Add at least one item')
    setSaving(true)
    try {
      await comparativeService.update(id, {
        ...form,
        quotations: form.quotations.map(q => ({
          ...q,
          gstPercent:  q.gstPercent  !== '' ? parseFloat(q.gstPercent)  : null,
          deliveryDays: q.deliveryDays !== '' ? parseInt(q.deliveryDays)  : null,
          totalAmount:  q.totalAmount !== '' ? parseFloat(q.totalAmount) : null,
        })),
        items: form.items.map(i => ({
          ...i,
          qty:          parseFloat(i.qty)          || 0,
          supplier1Rate: i.supplier1Rate !== '' ? parseFloat(i.supplier1Rate) : null,
          supplier2Rate: i.supplier2Rate !== '' ? parseFloat(i.supplier2Rate) : null,
          supplier3Rate: i.supplier3Rate !== '' ? parseFloat(i.supplier3Rate) : null,
          supplier4Rate: i.supplier4Rate !== '' ? parseFloat(i.supplier4Rate) : null,
          selectedRate:  i.selectedRate  !== '' ? parseFloat(i.selectedRate)  : null,
        })),
      })
      toast.success('CS updated successfully')
      navigate(`/comparative/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update CS')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
    </div>
  )
  if (!cs) return null

  const indent = cs.indent || {}

  return (
    <div className="max-w-6xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15}/> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={22}/> Edit CS — {cs.csNumber}</h1>
          <p className="page-subtitle text-amber-600 font-medium">Editing DRAFT — changes will update the comparative statement</p>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-5 text-sm text-blue-800">
        <strong>Indent:</strong> {indent.indentNumber} &nbsp;|&nbsp;
        <strong>Project:</strong> {indent.project?.projectName || '—'} &nbsp;|&nbsp;
        <strong>Site:</strong> {indent.site?.siteName || '—'}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Quotations */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Supplier Quotations</h3>
            {qFields.length < 4 && (
              <button type="button" onClick={() => qAppend({ ...BLANK_QUOTATION })} className="btn-primary btn-sm">
                <Plus size={14}/> Add Quotation
              </button>
            )}
          </div>
          <div className="card-body space-y-4">
            {qFields.map((field, qi) => (
              <div key={field.id} className={`rounded-lg border-l-4 ${COL[qi]?.lborder || 'border-l-4 border-l-gray-300'} border border-gray-200 p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-semibold text-sm ${COL[qi]?.head || 'text-gray-600'}`}>
                    Quotation {qi + 1} — {getSupplierName(qi)}
                  </h4>
                  {qFields.length > 1 && (
                    <button type="button" onClick={() => qRemove(qi)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="form-group col-span-2">
                    <label className="label text-xs">Supplier *</label>
                    <select {...register(`quotations.${qi}.supplierId`, { required: true })} className="input py-1.5 text-sm">
                      <option value="">Select supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label text-xs">Quotation Ref No.</label>
                    <input {...register(`quotations.${qi}.quotationRef`)} className="input py-1.5 text-sm" placeholder="Ref #"/>
                  </div>
                  <div className="form-group">
                    <label className="label text-xs">Quotation Date</label>
                    <input {...register(`quotations.${qi}.quotationDate`)} type="date" className="input py-1.5 text-sm"/>
                  </div>
                  <div className="form-group">
                    <label className="label text-xs">Total Quoted Amount (₹)</label>
                    <input {...register(`quotations.${qi}.totalAmount`)} type="number" step="0.01" className="input py-1.5 text-sm" placeholder="0.00"/>
                  </div>
                  <div className="form-group">
                    <label className="label text-xs">GST %</label>
                    <input {...register(`quotations.${qi}.gstPercent`)} type="number" step="0.01" className="input py-1.5 text-sm" placeholder="18"/>
                  </div>
                  <div className="form-group">
                    <label className="label text-xs">Delivery (Days)</label>
                    <input {...register(`quotations.${qi}.deliveryDays`)} type="number" className="input py-1.5 text-sm" placeholder="e.g. 7"/>
                  </div>
                  <div className="form-group">
                    <label className="label text-xs">Warranty</label>
                    <input {...register(`quotations.${qi}.warranty`)} className="input py-1.5 text-sm" placeholder="e.g. 1 year"/>
                  </div>
                  <div className="form-group col-span-2 md:col-span-4">
                    <label className="label text-xs">Remarks</label>
                    <input {...register(`quotations.${qi}.remarks`)} className="input py-1.5 text-sm" placeholder="Additional notes..."/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rate Comparison */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Rate Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Material</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-16">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-20">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Specification</th>
                  {Array.from({ length: numSuppliers }, (_, i) => (
                    <th key={i} className={`px-3 py-2 text-xs font-semibold text-center ${COL[i]?.head}`}>
                      {getSupplierName(i)}<br/>
                      <span className="font-normal text-gray-400">Rate / Amount</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {iFields.map((field, ii) => {
                  const mat = cs.items?.[ii]?.material
                  return (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{ii + 1}</td>
                      <td className="px-3 py-2 text-gray-700 font-medium">{mat?.materialName || '—'}</td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${ii}.unit`)} readOnly className="input py-1 w-16 bg-gray-50 text-xs"/>
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${ii}.qty`)} type="number" step="0.001" className="input py-1 w-20 text-xs"/>
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${ii}.specification`)} className="input py-1 text-xs" placeholder="Brand / spec"/>
                      </td>
                      {Array.from({ length: numSuppliers }, (_, si) => {
                        const rk  = RATE_KEYS[si]
                        const amt = getAmt(ii, rk)
                        return (
                          <td key={si} className="px-2 py-2">
                            <input {...register(`items.${ii}.${rk}`)} type="number" step="0.01"
                              className={`input py-1 w-24 text-xs text-center ${COL[si]?.lborder || ''}`}
                              placeholder="Rate"/>
                            {amt != null && (
                              <div className={`text-xs text-center mt-0.5 font-medium ${COL[si]?.head}`}>
                                ₹{fmtAmt(amt)}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              {numSuppliers > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 font-semibold text-gray-700 text-sm text-right">Total →</td>
                    {Array.from({ length: numSuppliers }, (_, si) => (
                      <td key={si} className={`px-2 py-2 font-bold text-sm text-center ${COL[si]?.head}`}>
                        ₹{fmtAmt(colTotal(RATE_KEYS[si]))}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Notes</h3></div>
          <div className="card-body">
            <textarea {...register('notes')} className="input" rows={3} placeholder="Additional notes / observations..."/>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input {...register('poWithoutCS')} type="checkbox" className="rounded border-gray-300"/>
              <span className="text-sm text-gray-700">Allow PO without CS (direct purchase)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Saving...' : 'Save CS Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditComparativePage
