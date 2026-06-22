import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { comparativeService, indentsService, suppliersService } from '../../services'
import { BarChart2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtAmt = (v) =>
  v != null && v !== '' && !isNaN(v)
    ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
    : '—'

const COL = [
  { head: 'text-blue-600',  rate: 'border-b-blue-400',  amt: 'text-blue-700',  lborder: 'border-l-4 border-l-blue-400' },
  { head: 'text-green-600', rate: 'border-b-green-400', amt: 'text-green-700', lborder: 'border-l-4 border-l-green-400' },
  { head: 'text-amber-600', rate: 'border-b-amber-400', amt: 'text-amber-700', lborder: 'border-l-4 border-l-amber-400' },
  { head: 'text-rose-600',  rate: 'border-b-rose-400',  amt: 'text-rose-700',  lborder: 'border-l-4 border-l-rose-400' },
]
const RATE_KEYS = ['supplier1Rate', 'supplier2Rate', 'supplier3Rate', 'supplier4Rate']

const BLANK_QUOTATION = {
  supplierId: '', quotationRef: '', quotationDate: '',
  totalAmount: '', gstPercent: '', deliveryDays: '', warranty: '', remarks: '',
}

const CreateComparativePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [indent, setIndent] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, control } = useForm({
    defaultValues: {
      indentId: searchParams.get('indentId') || '',
      notes: '',
      poWithoutCS: false,
      quotations: [{ ...BLANK_QUOTATION }],
      items: [],
    },
  })

  const { fields: qFields, append: qAppend, remove: qRemove } = useFieldArray({ control, name: 'quotations' })
  const { fields: iFields, append: iAppend } = useFieldArray({ control, name: 'items' })

  const watchedItems      = useWatch({ control, name: 'items' })
  const watchedQuotations = useWatch({ control, name: 'quotations' })

  const getSupplierName = (idx) => {
    const id = watchedQuotations?.[idx]?.supplierId
    if (!id) return `Supplier ${idx + 1}`
    return suppliers.find((s) => s.id === id)?.supplierName || `Supplier ${idx + 1}`
  }

  const getAmt = (itemIdx, rateKey) => {
    const item = watchedItems?.[itemIdx]
    if (!item) return null
    const qty  = parseFloat(item.qty)  || 0
    const rate = parseFloat(item[rateKey]) || 0
    return qty && rate ? qty * rate : null
  }

  const colTotal = (rateKey) =>
    (watchedItems || []).reduce((s, item) => {
      const qty  = parseFloat(item?.qty)       || 0
      const rate = parseFloat(item?.[rateKey]) || 0
      return s + qty * rate
    }, 0)

  const indentId    = searchParams.get('indentId')
  const numSuppliers = Math.min(qFields.length, 4)

  useEffect(() => {
    suppliersService.getAll({ limit: 200 }).then(({ data }) => setSuppliers(data.data || []))
    if (indentId) {
      indentsService.getById(indentId).then(({ data }) => {
        const ind = data.data
        setIndent(ind)
        if (ind.items) {
          ind.items.forEach((item) =>
            iAppend({
              materialId:    item.materialId,
              qty:           item.requestedQty,
              unit:          item.unit,
              specification: item.makeSpecifications || '',
              supplier1Rate: '',
              supplier2Rate: '',
              supplier3Rate: '',
              supplier4Rate: '',
              selectedRate:  '',
            })
          )
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-7xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><BarChart2 size={22} /> New Comparative Statement</h1>
          {indent && (
            <p className="page-subtitle">
              For Indent: <strong>{indent.indentNumber}</strong> — {indent.department} / {indent.category}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Notes / header */}
        <div className="card">
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="label flex items-center gap-2 md:col-span-2 cursor-pointer">
              <input type="checkbox" {...register('poWithoutCS')} className="rounded" />
              <span>Create PO without Comparative Statement</span>
            </label>
            <div className="form-group md:col-span-2">
              <label className="label">Notes</label>
              <textarea {...register('notes')} className="input" rows={2} placeholder="Comparative notes..." />
            </div>
          </div>
        </div>

        {/* ── Supplier Quotations ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Supplier Quotations</h3>
            {qFields.length < 4 && (
              <button type="button" onClick={() => qAppend({ ...BLANK_QUOTATION })} className="btn-secondary btn-sm">
                <Plus size={14} /> Add Supplier
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Supplier *</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Ref / Quot. No.</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Total Amount</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">GST %</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Delivery (days)</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Warranty</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Remarks</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {qFields.map((field, idx) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <select
                        {...register(`quotations.${idx}.supplierId`, { required: true })}
                        className={`input py-1.5 min-w-[170px] ${COL[idx]?.lborder || ''}`}
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.supplierName}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.quotationRef`)} className="input py-1.5 w-28" placeholder="Q-001" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.quotationDate`)} type="date" className="input py-1.5" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.totalAmount`)} type="number" step="0.01" className="input py-1.5 w-28" placeholder="0.00" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.gstPercent`)} type="number" step="0.01" className="input py-1.5 w-20" placeholder="18" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.deliveryDays`)} type="number" className="input py-1.5 w-20" placeholder="30" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.warranty`)} className="input py-1.5 w-28" placeholder="1 year" />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`quotations.${idx}.remarks`)} className="input py-1.5 w-32" placeholder="Notes" />
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

        {/* ── Rate Comparison ── */}
        {iFields.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-800">Rate Comparison by Item</h3>
              <p className="text-xs text-gray-400">Amount = Qty × Rate (auto-calculated)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  {/* Supplier name headers */}
                  <tr>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Material</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left min-w-[160px]">Specification</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">UoM</th>
                    {Array.from({ length: numSuppliers }, (_, i) => (
                      <th key={i} colSpan={2} className={`px-3 py-2.5 text-xs font-semibold text-center border-l border-gray-200 ${COL[i].head}`}>
                        {getSupplierName(i)}
                      </th>
                    ))}
                    <th colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-purple-600 text-center border-l border-gray-200">
                      Selected
                    </th>
                  </tr>
                  {/* Rate / Amount sub-headers */}
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th colSpan={4} />
                    {Array.from({ length: numSuppliers }, (_, i) => [
                      <th key={`${i}r`} className={`px-2 py-1.5 text-xs font-medium text-right border-l border-gray-200 ${COL[i].head}`}>Rate</th>,
                      <th key={`${i}a`} className={`px-2 py-1.5 text-xs font-medium text-right ${COL[i].head}`}>Amount</th>,
                    ])}
                    <th className="px-2 py-1.5 text-xs font-medium text-purple-500 text-right border-l border-gray-200">Rate</th>
                    <th className="px-2 py-1.5 text-xs font-medium text-purple-500 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {iFields.map((field, idx) => {
                    const aS = getAmt(idx, 'selectedRate')
                    return (
                      <tr key={field.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                          {indent?.items?.[idx]?.material?.materialName || `Item ${idx + 1}`}
                          <input type="hidden" {...register(`items.${idx}.materialId`)} />
                          <input type="hidden" {...register(`items.${idx}.unit`)} />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            {...register(`items.${idx}.specification`)}
                            className="input py-1 text-xs w-full"
                            placeholder="Brand / Make / Spec"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            {...register(`items.${idx}.qty`)}
                            type="number" step="0.001"
                            className="input py-1 w-20 text-center"
                          />
                        </td>
                        <td className="px-2 py-2 text-center text-gray-500 text-xs">
                          {watchedItems?.[idx]?.unit || ''}
                        </td>
                        {Array.from({ length: numSuppliers }, (_, i) => {
                          const a = getAmt(idx, RATE_KEYS[i])
                          return [
                            <td key={`${idx}${i}r`} className="px-2 py-2 border-l border-gray-100">
                              <input
                                {...register(`items.${idx}.${RATE_KEYS[i]}`)}
                                type="number" step="0.01"
                                className={`input py-1 w-24 border-b-2 ${COL[i].rate}`}
                                placeholder="Rate"
                              />
                            </td>,
                            <td key={`${idx}${i}a`} className={`px-2 py-2 text-right font-medium min-w-[90px] ${COL[i].amt}`}>
                              {a != null ? `₹${fmtAmt(a)}` : '—'}
                            </td>,
                          ]
                        })}
                        <td className="px-2 py-2 border-l border-gray-100">
                          <input
                            {...register(`items.${idx}.selectedRate`)}
                            type="number" step="0.01"
                            className="input py-1 w-24 border-purple-300 bg-purple-50"
                            placeholder="Final"
                          />
                        </td>
                        <td className="px-2 py-2 text-right text-purple-700 font-bold min-w-[90px]">
                          {aS != null ? `₹${fmtAmt(aS)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-700">TOTAL</td>
                    {Array.from({ length: numSuppliers }, (_, i) => {
                      const t = colTotal(RATE_KEYS[i])
                      return [
                        <td key={`t${i}r`} className="px-2 py-2 border-l border-gray-200" />,
                        <td key={`t${i}a`} className={`px-2 py-2 text-right font-bold ${COL[i].amt}`}>
                          {t > 0 ? `₹${fmtAmt(t)}` : '—'}
                        </td>,
                      ]
                    })}
                    <td className="px-2 py-2 border-l border-gray-200" />
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
