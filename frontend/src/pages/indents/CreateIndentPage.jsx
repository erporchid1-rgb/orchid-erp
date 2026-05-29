import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { indentsService, projectsService, sitesService, materialsService } from '../../services'
import { ClipboardList, Plus, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const CreateIndentPage = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [sites, setSites] = useState([])
  const [materials, setMaterials] = useState([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({
    defaultValues: {
      requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      items: [{ materialId: '', requestedQty: 1, unit: '', remarks: '' }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedProject = watch('projectId')

  useEffect(() => {
    Promise.all([
      projectsService.getAll({ limit: 100 }),
      materialsService.getAll({ limit: 500 }),
    ]).then(([p, m]) => {
      setProjects(p.data.data || [])
      setMaterials(m.data.data || [])
    })
  }, [])

  useEffect(() => {
    if (watchedProject) {
      sitesService.getByProject(watchedProject).then(({ data }) => setSites(data.data || []))
    } else {
      setSites([])
    }
  }, [watchedProject])

  const handleMaterialChange = (index, materialId) => {
    const mat = materials.find((m) => m.id === materialId)
    if (mat) setValue(`items.${index}.unit`, mat.unit)
  }

  const onSubmit = async (form) => {
    if (!form.items?.length) return toast.error('Add at least one material')
    setSaving(true)
    try {
      const res = await indentsService.create(form)
      toast.success(`Indent ${res.data.data.indentNumber} raised successfully`)
      navigate('/indents')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise indent')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><ClipboardList size={24} /> Raise Material Indent</h1>
          <p className="page-subtitle">Request materials needed at site — will be sent to purchase department</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Indent Details */}
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Requisition Details</h3></div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="label">Required By Date *</label>
              <input {...register('requiredDate', { required: 'Required' })} type="date" className="input" />
              {errors.requiredDate && <p className="error-text">{errors.requiredDate.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Purpose / Work Description</label>
              <input {...register('purpose')} className="input" placeholder="e.g. Foundation work - Block A" />
            </div>
            <div className="form-group md:col-span-2">
              <label className="label">Remarks</label>
              <textarea {...register('remarks')} className="input" rows={2} placeholder="Any special instructions or notes..." />
            </div>
          </div>
        </div>

        {/* Materials Required */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Materials Required</h3>
            <button
              type="button"
              onClick={() => append({ materialId: '', requestedQty: 1, unit: '', remarks: '' })}
              className="btn-primary btn-sm"
            >
              <Plus size={14} /> Add Material
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Material *</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Unit</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Qty Required *</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Remarks</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field, idx) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <select
                        {...register(`items.${idx}.materialId`, { required: true })}
                        onChange={(e) => handleMaterialChange(idx, e.target.value)}
                        className="input py-1.5 min-w-[200px]"
                      >
                        <option value="">Select material</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.materialName} ({m.unit})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`items.${idx}.unit`)} readOnly className="input py-1.5 w-20 bg-gray-50" placeholder="Unit" />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        {...register(`items.${idx}.requestedQty`, { required: true, min: 0.001 })}
                        type="number" step="0.001" min="0.001"
                        className="input py-1.5 w-28"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input {...register(`items.${idx}.remarks`)} className="input py-1.5 w-40" placeholder="Optional" />
                    </td>
                    <td className="px-3 py-2">
                      {fields.length > 1 && (
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
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary btn-lg">
            {saving ? 'Raising Indent...' : 'Raise Indent'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateIndentPage
