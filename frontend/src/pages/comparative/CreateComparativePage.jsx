import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { comparativeService, indentsService, suppliersService } from '../../services'
import { BarChart2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

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
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Selected?</th>
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
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" {...register(`quotations.${idx}.isSelected`)} className="rounded" />
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
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Material</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Qty</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">UoM</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Supplier 1 Rate</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Supplier 2 Rate</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Supplier 3 Rate</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Selected Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {iFields.map((field, idx) => (
                    <tr key={field.id}>
                      <td className="px-3 py-2 text-sm font-medium">
                        {indent?.items?.[idx]?.material?.materialName || `Item ${idx + 1}`}
                        <input type="hidden" {...register(`items.${idx}.materialId`)} />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.qty`)} type="number" step="0.001" className="input py-1.5 w-20" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.unit`)} className="input py-1.5 w-16 bg-gray-50" readOnly />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.supplier1Rate`)} type="number" step="0.01" className="input py-1.5 w-28" placeholder="Rate" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.supplier2Rate`)} type="number" step="0.01" className="input py-1.5 w-28" placeholder="Rate" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.supplier3Rate`)} type="number" step="0.01" className="input py-1.5 w-28" placeholder="Rate" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.selectedRate`)} type="number" step="0.01" className="input py-1.5 w-28 border-green-300 bg-green-50" placeholder="Final" />
                      </td>
                    </tr>
                  ))}
                </tbody>
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
