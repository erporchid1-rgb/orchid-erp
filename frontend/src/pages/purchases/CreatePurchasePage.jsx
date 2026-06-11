import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  purchasesService, suppliersService, projectsService, sitesService,
  materialsService, nfaService, comparativeService
} from '../../services'
import { formatCurrency } from '../../utils/helpers'
import { Plus, Trash2, ArrowLeft, ShoppingCart, FileCheck, Building2, MapPin, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtAmt = (v) => v != null ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v) : '0'

// Step 1 — pick from MD_APPROVED NFAs
const NFAPickerStep = ({ onSelect }) => {
  const [nfas,    setNfas]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    nfaService.getAll({ status: 'MD_APPROVED', limit: 100 })
      .then(({ data }) => setNfas(data.data || []))
      .catch(() => toast.error('Failed to load approved NFAs'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  if (nfas.length === 0) return (
    <div className="card p-12 text-center text-gray-500">
      <FileCheck size={40} className="mx-auto mb-3 text-gray-300" />
      <p className="font-semibold text-gray-700">No MD-Approved NFAs found</p>
      <p className="text-sm mt-1">NFA must be MD Approved before creating a Purchase Order.</p>
    </div>
  )

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Select the NFA for which you want to create a Purchase Order. All details will be auto-filled.
      </p>
      <div className="space-y-3">
        {nfas.map(nfa => {
          const project = nfa.indent?.project?.projectName
          const site    = nfa.indent?.site?.siteName
          const supplier = nfa.selectedSupplier?.supplierName
          return (
            <button key={nfa.id} onClick={() => onSelect(nfa.id)}
              className="w-full text-left card p-4 hover:border-primary-400 hover:bg-primary-50 transition-colors border-2 border-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-primary-700">{nfa.nfaNumber}</span>
                    <span className="badge badge-green text-xs">MD Approved</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
                    {project && (
                      <span className="flex items-center gap-1">
                        <Building2 size={11} /> {project}
                      </span>
                    )}
                    {site && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {site}
                      </span>
                    )}
                    {supplier && (
                      <span className="flex items-center gap-1">
                        <Package size={11} /> {supplier}
                      </span>
                    )}
                  </div>
                  {nfa.natureOfWork && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{nfa.natureOfWork}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-800">₹{fmtAmt(nfa.totalAmount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Grand Total</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const DEFAULT_TC = `1. GST shall be paid extra as applicable.
2. The above rates are FOR at site including Cartage, Loading etc.
3. The payment shall be made as per agreed payment terms.
4. Unloading: The above rates are inclusive of unloading charges.
5. Test Certificate shall be provided with each consignment.
6. Material will be got tested if required by the Project-in-charge.
7. Delivery: Within agreed timeline from the release of Purchase Order.
8. Important Delivery Note: Deliveries are not accepted on Saturdays & Sundays.`

const CreatePurchasePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlNfaId = searchParams.get('nfaId')

  const [step,         setStep]         = useState(urlNfaId ? 'form' : 'pick')  // 'pick' | 'form'
  const [selectedNfaId,setSelectedNfaId]= useState(urlNfaId || null)
  const [linkedNFA,    setLinkedNFA]    = useState(null)
  const [suppliers,    setSuppliers]    = useState([])
  const [projects,     setProjects]     = useState([])
  const [sites,        setSites]        = useState([])
  const [materials,    setMaterials]    = useState([])
  const [saving,       setSaving]       = useState(false)
  const [loadingNFA,   setLoadingNFA]   = useState(!!urlNfaId)

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      poType: 'PO',
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      transportCost: 0,
      discountAmount: 0,
      paymentTerms: '',
      advancePercent: '',
      termsConditions: DEFAULT_TC,
      items: [{ materialId: '', quantity: 1, rate: 0, unit: '', gstPercent: 18 }],
    }
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' })
  const watchedItems   = watch('items')
  const watchedProject = watch('projectId')

  // Load reference data
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

  // Auto-fill from NFA
  useEffect(() => {
    if (!selectedNfaId) return
    setLoadingNFA(true)
    nfaService.getById(selectedNfaId)
      .then(async ({ data }) => {
        const nfa = data.data
        setLinkedNFA(nfa)

        // Fetch CS items if CS exists
        let csItems = []
        if (nfa.csId) {
          try {
            const csRes = await comparativeService.getById(nfa.csId)
            csItems = csRes.data.data.items || []
          } catch {}
        }

        // Build PO items from CS items (selectedRate) or empty
        const poItems = csItems.length > 0
          ? csItems.map(i => ({
              materialId: i.materialId,
              unit:       i.unit,
              quantity:   i.qty,
              rate:       i.selectedRate || 0,
              gstPercent: 18,
            }))
          : [{ materialId: '', quantity: 1, rate: 0, unit: '', gstPercent: 18 }]

        // Build auto subject from items + project
        const matNames = csItems.map(i => i.material?.materialName).filter(Boolean).join(', ')
        const projName = nfa.indent?.project?.projectName || ''
        const siteName = nfa.indent?.site?.siteName || ''
        const autoSubject = matNames
          ? `Order for Supply of ${matNames} for ${[projName, siteName].filter(Boolean).join(' — ')}`
          : ''

        reset({
          poType:          'PO',
          purchaseDate:    new Date().toISOString().split('T')[0],
          status:          'DRAFT',
          supplierId:      nfa.selectedSupplierId || '',
          projectId:       nfa.indent?.project?.id || '',
          siteId:          nfa.indent?.site?.id || '',
          indentId:        nfa.indentId || '',
          nfaId:           nfa.id,
          paymentTerms:    nfa.paymentTerms || '',
          advancePercent:  nfa.advancePercent ? String(nfa.advancePercent) : '',
          transportCost:   0,
          discountAmount:  0,
          termsConditions: DEFAULT_TC,
          notes:           autoSubject,
          items:           poItems,
        })

        // Load sites for the project
        if (nfa.indent?.project?.id) {
          sitesService.getByProject(nfa.indent.project.id)
            .then(({ data }) => setSites(data.data || []))
        }
      })
      .catch(() => toast.error('Could not load NFA details'))
      .finally(() => { setLoadingNFA(false); setStep('form') })
  }, [selectedNfaId])

  // Sites by project
  useEffect(() => {
    if (watchedProject) {
      sitesService.getByProject(watchedProject).then(({ data }) => setSites(data.data || []))
    }
  }, [watchedProject])

  const handleMaterialChange = (index, materialId) => {
    const mat = materials.find(m => m.id === materialId)
    if (mat) setValue(`items.${index}.unit`, mat.unit)
  }

  // Totals
  const calcBaseTotal = () =>
    (watchedItems || []).reduce((sum, item) => sum + (parseFloat(item.quantity)||0) * (parseFloat(item.rate)||0), 0)

  const calcGSTTotal = () =>
    (watchedItems || []).reduce((sum, item) => {
      const base = (parseFloat(item.quantity)||0) * (parseFloat(item.rate)||0)
      return sum + base * (parseFloat(item.gstPercent)||0) / 100
    }, 0)

  const calcGrandTotal = () => {
    const base = calcBaseTotal()
    const gst  = calcGSTTotal()
    const transport = parseFloat(watch('transportCost') || 0)
    const discount  = parseFloat(watch('discountAmount') || 0)
    return base + gst + transport - discount
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        refInvoiceDate: form.refInvoiceDate ? new Date(form.refInvoiceDate).toISOString() : undefined,
      }
      const res = await purchasesService.create(payload)
      toast.success('Purchase Order created')
      navigate(`/purchases/${res.data.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create purchase')
    } finally { setSaving(false) }
  }

  if (loadingNFA) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  // ── Step 1: NFA picker ──
  if (step === 'pick') return (
    <div className="max-w-3xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24} /> New Purchase Order</h1>
          <p className="page-subtitle">Step 1 of 2 — Select an approved NFA</p>
        </div>
      </div>
      <NFAPickerStep onSelect={(id) => { setSelectedNfaId(id); setLoadingNFA(true) }} />
    </div>
  )

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <button
            onClick={() => { setStep('pick'); setSelectedNfaId(null); setLinkedNFA(null) }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Change NFA
          </button>
          <h1 className="page-title flex items-center gap-2"><ShoppingCart size={24} /> New Purchase Order</h1>
          {linkedNFA && (
            <div className="flex items-center gap-2 mt-1 text-sm text-primary-700">
              <FileCheck size={14} />
              <span>From NFA: <strong>{linkedNFA.nfaNumber}</strong></span>
              {linkedNFA.selectedSupplier && (
                <span className="text-gray-500">— {linkedNFA.selectedSupplier.supplierName}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Hidden NFA / indent linkage */}
        <input type="hidden" {...register('nfaId')} />
        <input type="hidden" {...register('indentId')} />

        {/* ── PO Header ── */}
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
              <input {...register('purchaseDate', { required: 'Required' })} type="date" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Expected Delivery Date</label>
              <input {...register('deliveryDate')} type="date" className="input" />
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

        {/* ── Supplier Reference ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Supplier Reference</h3></div>
          <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Ref. Invoice / Quotation No.</label>
              <input {...register('refInvoiceNo')} className="input" placeholder="e.g. PI-20" />
            </div>
            <div className="form-group">
              <label className="label">Ref. Invoice Date</label>
              <input {...register('refInvoiceDate')} type="date" className="input" />
            </div>
            <div className="form-group col-span-1" />
            <div className="form-group">
              <label className="label">Kind Attn. (Person at supplier)</label>
              <input {...register('attnPerson')} className="input" placeholder="e.g. Mr. Gurmeet Singh Arora" />
            </div>
            <div className="form-group">
              <label className="label">Attn. Mobile</label>
              <input {...register('attnMobile')} className="input" placeholder="+91 98XXXXXXXX" />
            </div>
          </div>
        </div>

        {/* ── Payment Terms ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Payment & Terms</h3></div>
          <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Payment Terms</label>
              <input {...register('paymentTerms')} className="input" placeholder="e.g. 100% advance / 30 days" />
            </div>
            <div className="form-group">
              <label className="label">Advance (%)</label>
              <input {...register('advancePercent')} type="number" step="0.01" min="0" max="100" className="input" placeholder="e.g. 100" />
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
              <input {...register('notes')} className="input" placeholder="e.g. Order for Supply of TMT Steel Bars for Orchid Ivy..." />
            </div>
            <div className="form-group md:col-span-3">
              <label className="label">Terms & Conditions</label>
              <textarea {...register('termsConditions')} className="input font-mono text-xs" rows={8}
                placeholder="Enter numbered terms & conditions..." />
            </div>
          </div>
        </div>

        {/* ── Contact Person (our side) ── */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Contact Person (Our Side)</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Contact Person Name</label>
              <input {...register('contactPerson')} className="input" placeholder="e.g. Mr. Ajit Shandilya" />
            </div>
            <div className="form-group">
              <label className="label">Contact Mobile</label>
              <input {...register('contactMobile')} className="input" placeholder="+91 93XXXXXXXX" />
            </div>
          </div>
        </div>

        {/* ── Items ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Purchase Items</h3>
            <button type="button"
              onClick={() => append({ materialId: '', quantity: 1, rate: 0, unit: '', gstPercent: 18 })}
              className="btn-primary btn-sm flex items-center gap-1">
              <Plus size={14} /> Add Item
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
                        <select
                          {...register(`items.${idx}.materialId`, { required: true })}
                          onChange={e => handleMaterialChange(idx, e.target.value)}
                          className="input py-1.5 min-w-[200px]">
                          <option value="">Select material</option>
                          {materials.map(m => <option key={m.id} value={m.id}>{m.materialName}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.unit`)} className="input py-1.5 w-20" readOnly />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.quantity`, { required: true, min: 0.001 })}
                          type="number" step="0.001" className="input py-1.5 w-24" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.rate`, { required: true, min: 0 })}
                          type="number" step="0.01" className="input py-1.5 w-28" />
                      </td>
                      <td className="px-3 py-2">
                        <input {...register(`items.${idx}.gstPercent`)}
                          type="number" step="0.1" className="input py-1.5 w-20" />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800 text-sm">{formatCurrency(amount)}</td>
                      <td className="px-3 py-2">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end p-4 border-t border-gray-100">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount (ex-GST)</span>
                <span className="font-medium">{formatCurrency(calcBaseTotal())}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 flex-1">Transport / Freight</span>
                <input {...register('transportCost')} type="number" step="0.01"
                  className="input py-1 w-28 text-right" />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST</span>
                <span className="font-medium">{formatCurrency(calcGSTTotal())}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 flex-1">Discount</span>
                <input {...register('discountAmount')} type="number" step="0.01"
                  className="input py-1 w-28 text-right" />
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
            {saving ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePurchasePage
