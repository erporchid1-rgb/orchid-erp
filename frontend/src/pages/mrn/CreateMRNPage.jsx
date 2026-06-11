import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { mrnService, purchasesService } from '../../services'
import { Truck, Plus, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const DOC_TYPES = ['INVOICE', 'CN', 'WEIGHT_SLIP', 'MTC', 'BILTY', 'OTHER']
const RECEIPT_TYPES = [
  { value: 'PURCHASE',      label: 'Purchase (PO Based)' },
  { value: 'GATE_PASS',     label: 'Gate Pass' },
  { value: 'NRGP',          label: 'Non-Returnable Gate Pass' },
  { value: 'SITE_TRANSFER', label: 'Site Transfer' },
]

const CreateMRNPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [purchases, setPurchases] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [saving, setSaving] = useState(false)

  const purchaseId = searchParams.get('purchaseId')

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({
    defaultValues: {
      purchaseId: purchaseId || '',
      receiptType: 'PURCHASE',
      mrnDate: new Date().toISOString().split('T')[0],
      vehicleDetails: '',
      invoiceDate: '',
      invoiceNo: '',
      ewayBillNo: '',
      remarks: '',
      items: [],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedPO = watch('purchaseId')

  useEffect(() => {
    purchasesService.getAll({ status: 'CONFIRMED', limit: 200 }).then(({ data }) => {
      setPurchases(data.data || [])
    })
  }, [])

  useEffect(() => {
    if (watchedPO) {
      const po = purchases.find((p) => p.id === watchedPO)
      setSelectedPO(po)
      if (po?.items) {
        // clear existing items
        while (fields.length > 0) remove(0)
        po.items.forEach((item) => {
          append({
            materialId: item.materialId,
            materialName: item.material?.materialName,
            poQty: item.quantity,
            receivedQty: item.quantity,
            rejectedQty: 0,
            unit: item.unit,
            poRate: item.rate,
            receivedRate: item.rate,
            remarks: '',
          })
        })
      }
    }
  }, [watchedPO, purchases])

  const onSubmit = async (form) => {
    if (!form.items?.length) return toast.error('Add at least one item')
    setSaving(true)
    try {
      const res = await mrnService.create(form)
      toast.success(`MRN ${res.data.data.mrnNumber} created`)
      navigate('/mrn')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create MRN')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><Truck size={22} /> Create MRN — Materials Receiving Note</h1>
          <p className="page-subtitle">Record physical receipt of materials at site</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Receipt Details</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Receipt Type *</label>
              <select {...register('receiptType', { required: 'Required' })} className="input">
                {RECEIPT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Against PO (if applicable)</label>
              <select {...register('purchaseId')} className="input">
                <option value="">No PO / Internal Transfer</option>
                {purchases.map((po) => (
                  <option key={po.id} value={po.id}>{po.billNo} — {po.supplier?.supplierName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">MRN Date *</label>
              <input {...register('mrnDate', { required: 'Required' })} type="date" className="input" />
              {errors.mrnDate && <p className="error-text">{errors.mrnDate.message}</p>}
            </div>

            <div className="form-group">
              <label className="label">Vehicle Details</label>
              <input {...register('vehicleDetails')} className="input" placeholder="Vehicle No., Driver name" />
            </div>
            <div className="form-group">
              <label className="label">Invoice Date</label>
              <input {...register('invoiceDate')} type="date" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Invoice No.</label>
              <input {...register('invoiceNo')} className="input" placeholder="Supplier invoice number" />
            </div>

            <div className="form-group">
              <label className="label">E-Way Bill No. (if applicable)</label>
              <input {...register('ewayBillNo')} className="input" placeholder="E-Way Bill number" />
            </div>
            <div className="form-group md:col-span-2">
              <label className="label">Remarks</label>
              <input {...register('remarks')} className="input" placeholder="Any additional notes..." />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Materials Received</h3>
            {!watchedPO && (
              <button type="button" onClick={() => append({ materialId: '', materialName: '', poQty: 0, receivedQty: 0, rejectedQty: 0, unit: '', poRate: 0, receivedRate: '', remarks: '' })}
                className="btn-secondary btn-sm"><Plus size={14} /> Add Item</button>
            )}
          </div>
          {fields.length === 0 ? (
            <div className="p-6 text-center text-gray-400">Select a PO above to auto-fill items, or add manually</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">Material</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">UoM</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">PO Qty</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">Received Qty</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">Rejected Qty</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">PO Rate</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">Received Rate</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">Remarks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((field, idx) => (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-sm">
                        {field.materialName || <input {...register(`items.${idx}.materialId`)} className="input py-1.5 w-32" placeholder="Material ID" />}
                        <input type="hidden" {...register(`items.${idx}.materialId`)} />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.unit`)} className="input py-1.5 w-16 bg-gray-50" readOnly />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.poQty`)} type="number" step="0.001" className="input py-1.5 w-24 bg-gray-50" readOnly />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.receivedQty`, { required: true, min: 0 })} type="number" step="0.001" min="0"
                          className="input py-1.5 w-24 border-green-300" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.rejectedQty`)} type="number" step="0.001" min="0"
                          className="input py-1.5 w-24 border-red-200" defaultValue={0} />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.poRate`)} type="number" step="0.01" className="input py-1.5 w-24 bg-gray-50" readOnly />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.receivedRate`)} type="number" step="0.01" className="input py-1.5 w-24 border-orange-200" placeholder="If diff" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.remarks`)} className="input py-1.5 w-32" placeholder="Accept/Reject" />
                      </td>
                      <td className="px-3 py-2">
                        {!watchedPO && (
                          <button type="button" onClick={() => remove(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Document upload note */}
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-600 font-medium mb-2">Supported Documents (upload after creation):</p>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((d) => (
                <span key={d} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{d}</span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Invoice / CN / Weight Slip / MTC / Transport Bilty / Other</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Creating MRN...' : 'Create MRN'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateMRNPage
