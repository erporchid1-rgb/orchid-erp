import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { issuesService, projectsService, sitesService, materialsService, stockService } from '../../services'
import { Plus, Trash2, ArrowLeft, ArrowDownToLine } from 'lucide-react'
import toast from 'react-hot-toast'

const CreateIssuePage = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [materials, setMaterials] = useState([])
  const [stockLevels, setStockLevels] = useState({})
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm({
    defaultValues: {
      issueDate: new Date().toISOString().split('T')[0],
      items: [{ materialId: '', quantity: 1, unit: '' }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedProject = watch('projectId')
  const watchedSite = watch('siteId')

  useEffect(() => {
    Promise.all([projectsService.getAll({ limit: 100 }), materialsService.getAll({ limit: 500 })])
      .then(([p, m]) => { setProjects(p.data.data || []); setMaterials(m.data.data || []) })
  }, [])

  useEffect(() => {
    if (watchedProject) {
      sitesService.getByProject(watchedProject).then(({ data }) => setSites(data.data || []))
    }
  }, [watchedProject])

  const handleMaterialChange = async (index, materialId) => {
    const mat = materials.find((m) => m.id === materialId)
    if (mat) {
      const stockRes = await stockService.getCurrent({ projectId: watchedProject, siteId: watchedSite })
      const stockItem = stockRes.data.data?.find((s) => s.materialId === materialId)
      setStockLevels((prev) => ({ ...prev, [index]: { available: stockItem?.currentStock || 0, unit: mat.unit } }))
    }
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      await issuesService.create(form)
      toast.success('Issue created — pending approval')
      navigate('/issues')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create issue')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><ArrowDownToLine size={24} /> New Material Issue</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Issue Details</h3></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Issue Date *</label>
              <input {...register('issueDate', { required: 'Required' })} type="date" className="input" />
            </div>
            <div className="form-group">
              <label className="label">Issued To *</label>
              <input {...register('issuedTo', { required: 'Required' })} className="input" placeholder="Engineer/Contractor name" />
              {errors.issuedTo && <p className="error-text">{errors.issuedTo.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Project</label>
              <select {...register('projectId')} className="input">
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Site</label>
              <select {...register('siteId')} className="input" disabled={!watchedProject}>
                <option value="">Select site</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
              </select>
            </div>
            <div className="col-span-2 form-group">
              <label className="label">Purpose</label>
              <input {...register('purpose')} className="input" placeholder="Purpose of issue..." />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Materials to Issue</h3>
            <button type="button" onClick={() => append({ materialId: '', quantity: 1, unit: '' })} className="btn-primary btn-sm">
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Material', 'Unit', 'Available Stock', 'Quantity to Issue', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, idx) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <select {...register(`items.${idx}.materialId`, { required: true })} onChange={(e) => handleMaterialChange(idx, e.target.value)} className="input py-1.5 min-w-[200px]">
                        <option value="">Select material</option>
                        {materials.map((m) => <option key={m.id} value={m.id}>{m.materialName}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`items.${idx}.unit`)} className="input py-1.5 w-20" readOnly />
                    </td>
                    <td className="px-3 py-2">
                      {stockLevels[idx] ? (
                        <span className={`font-semibold ${stockLevels[idx].available <= 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {stockLevels[idx].available} {stockLevels[idx].unit}
                        </span>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`items.${idx}.quantity`, { required: true, min: 0.001 })} type="number" step="0.001" className="input py-1.5 w-28" />
                    </td>
                    <td className="px-3 py-2">
                      {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Creating...' : 'Submit Issue Request'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateIssuePage
