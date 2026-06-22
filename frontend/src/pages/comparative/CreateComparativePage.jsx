import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { comparativeService, indentsService, suppliersService } from '../../services'
import { BarChart2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtAmt = (v) => v != null && v !== '' && !isNaN(v)
  ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
  : '—'

const CreateComparativePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [indent, setIndent] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      indentId: searchParams.get('indentId') || '',
      notes: '',
      poWithoutCS: false,
      quotations: [{ supplierId: '', quotationDate: '', totalAmount: '', remarks: '' }],
      items: [],
    }
  })

  const { fields: qFields, append: qAppend, remove: qRemove } = useFieldArray({ control, name: 'quotations' })
  const { fields: iFields, append: iAppend, remove: iRemove } = useFieldArray({ control, name: 'items' })

  const watchedItems = useWatch({ control, name: 'items' })

  const getAmt = (itemIdx, rateKey) => {
    const item = watchedItems?.[itemIdx]
    if (!item) return null
    const qty  = parseFloat(item.qty) || 0
    const rate = parseFloat(item[rateKey]) || 0
    return qty && rate ? qty * rate : null
  }
  const colTotal = (rateKey) =>
    (watchedItems || []).reduce((s, item) => {
      const qty  = parseFloat(item?.qty) || 0
      const rate = parseFloat(item?.[rateKey]) || 0
      return s + (qty * rate)
    }, 0)

  const indentId = searchParams.get('indentId')

  useEffect(() => {
    suppliersService.getAll({ limit: 200 }).then(({ data }) => setSuppliers(data.data || []))
    if (indentId) {
      indentsService.getById(indentId).then(({ data }) => {
        const ind = data.data
        setIndent(ind)
        // Pre-fill items from indent
        if (ind.items) {
          ind.items.forEach((item) => {
            iAppend({
              materialId: item.materialId,
              qty: item.requestedQty,
              unit: item.unit,
              supplier1Rate: '',
              supplier2Rate: '',
              supplier3Rate: '',
              selectedRate: '',
            })
          })
        }
      })
    }
  }, [indentId])

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      const res = await comparativeService.create({ ...form, indentId: indentId || form.indentId })
      toast.success(`CS ${res.data.data.csNumber} created`)
      navigate('/comparative')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={22} /> New Comparative Statement</h1>
          {indent && (
            <p className="page-subtitle">For Indent: <strong>{indent.indentNumber}</strong> — {indent.department} / {indent.category}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group md:col-span-2">
              <label className="label flex items-center gap-2">
                <input type="checkbox" {...register('poWithoutCS')} className="rounded" />
                <span>Create PO without Comparative Statement</span>
              </label>
            </div>
            <div className="form-group md:col-span-2">
              <label className="label">Notes</label>
              <textarea {...register('notes')} className="input" rows={2} placeholder="Comparative notes..." />
            </div>
          </div>
        </div>

        {/* Quotations */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Supplier Quotations</h3>
            <button type="button" onClick={() => qAppend({ supplierId: '', quotationDate: '', totalAmount: '', remarks: '' })} className="btn-secondary btn-sm">
              <Plus size={14} /> Add Supplier
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Supplier *</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Quotation Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Total Amount</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {qFields.map((field, idx) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <select {...register(`quotations.${idx}.supplierId`, { required: true })} className="input py-1.5 min-w-[180px]">
                        <option value="">Select supplier</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.quotationDate`)} type="date" className="input py-1.5" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.totalAmount`)} type="number" step="0.01" className="input py-1.5 w-32" placeholder="0.00" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.remarks`)} className="input py-1.5 w-36" placeholder="Notes" />
                    </td>
                    <td className="px-3 py-2">
                      {qFields.length > 1 && (
                        <button type="button" onClick={() => qRemove(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Items comparison (optional) */}
        {iFields.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-800">Rate Comparison by Item</h3>
              <p className="text-xs text-gray-400">Amount = Qty × Rate (auto-calculated)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Material</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500">Qty</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500">UoM</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-blue-600 text-center" colSpan={2}>Supplier 1</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-green-600 text-center" colSpan={2}>Supplier 2</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-amber-600 text-center" colSpan={2}>Supplier 3</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-purple-600 text-center" colSpan={2}>Selected</th>
                  </tr>
                  <tr className="bg-gray-50 border-b">
                    <th colSpan={3} />
                    {['blue','green','amber','purple'].map(c => (
                      <>
                        <th key={c+'r'} className={`px-2 py-1.5 text-xs font-medium text-${c}-500 text-right`}>Rate</th>
                        <th key={c+'a'} className={`px-2 py-1.5 text-xs font-medium text-${c}-500 text-right border-r border-gray-200`}>Amount</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {iFields.map((field, idx) => {
                    const a1 = getAmt(idx, 'supplier1Rate')
                    const a2 = getAmt(idx, 'supplier2Rate')
                    const a3 = getAmt(idx, 'supplier3Rate')
                    const aS = getAmt(idx, 'selectedRate')
                    return (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {indent?.items?.[idx]?.material?.materialName || `Item ${idx + 1}`}
                          <input type="hidden" {...register(`items.${idx}.materialId`)} />
                        </td>
                        <td className="px-2 py-2">
                          <input {...register(`items.${idx}.qty`)} type="number" step="0.001" className="input py-1 w-20 text-center" />
                        </td>
                        <td className="px-2 py-2">
                          <input {...register(`items.${idx}.unit`)} className="input py-1 w-14 bg-gray-50 text-center" readOnly />
                        </td>
                        {/* Supplier 1 */}
                        <td className="px-2 py-2">
                          <input {...register(`items.${idx}.supplier1Rate`)} type="number" step="0.01" className="input py-1 w-24 border-blue-200" placeholder="Rate" />
                        </td>
                        <td className="px-2 py-2 text-right text-blue-700 font-medium border-r border-gray-200 min-w-[90px]">
                          {a1 != null ? `₹${fmtAmt(a1)}` : '—'}
                        </td>
                        {/* Supplier 2 */}
                        <td className="px-2 py-2">
                          <input {...register(`items.${idx}.supplier2Rate`)} type="number" step="0.01" className="input py-1 w-24 border-green-200" placeholder="Rate" />
                        </td>
                        <td className="px-2 py-2 text-right text-green-700 font-medium border-r border-gray-200 min-w-[90px]">
                          {a2 != null ? `₹${fmtAmt(a2)}` : '—'}
                        </td>
                        {/* Supplier 3 */}
                        <td className="px-2 py-2">
                          <input {...register(`items.${idx}.supplier3Rate`)} type="number" step="0.01" className="input py-1 w-24 border-amber-200" placeholder="Rate" />
                        </td>
                        <td className="px-2 py-2 text-right text-amber-700 font-medium border-r border-gray-200 min-w-[90px]">
                          {a3 != null ? `₹${fmtAmt(a3)}` : '—'}
                        </td>
                        {/* Selected */}
                        <td className="px-2 py-2">
                          <input {...register(`items.${idx}.selectedRate`)} type="number" step="0.01" className="input py-1 w-24 border-purple-300 bg-purple-50" placeholder="Final" />
                        </td>
                        <td className="px-2 py-2 text-right text-purple-700 font-bold min-w-[90px]">
                          {aS != null ? `₹${fmtAmt(aS)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-xs font-bold text-gray-700">TOTAL</td>
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right font-bold text-blue-700 border-r border-gray-200">
                      {colTotal('supplier1Rate') > 0 ? `₹${fmtAmt(colTotal('supplier1Rate'))}` : '—'}
                    </td>
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right font-bold text-green-700 border-r border-gray-200">
                      {colTotal('supplier2Rate') > 0 ? `₹${fmtAmt(colTotal('supplier2Rate'))}` : '—'}
                    </td>
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right font-bold text-amber-700 border-r border-gray-200">
                      {colTotal('supplier3Rate') > 0 ? `₹${fmtAmt(colTotal('supplier3Rate'))}` : '—'}
                    </td>
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right font-bold text-purple-700">
                      {colTotal('selectedRate') > 0 ? `₹${fmtAmt(colTotal('selectedRate'))}` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Saving...' : 'Create Comparative Statement'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateComparativePage
