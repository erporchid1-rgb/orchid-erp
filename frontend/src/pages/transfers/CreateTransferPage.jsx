import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { transfersService, projectsService, sitesService, materialsService } from '../../services'
import { Plus, Trash2, ArrowLeft, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const CreateTransferPage = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [fromSites, setFromSites] = useState([])
  const [toSites, setToSites] = useState([])
  const [materials, setMaterials] = useState([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, control } = useForm({
    defaultValues: {
      transferDate: new Date().toISOString().split('T')[0],
      items: [{ materialId: '', quantity: 1, unit: '' }],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedFromProject = watch('fromProjectId')
  const watchedToProject = watch('toProjectId')

  useEffect(() => {
    Promise.all([projectsService.getAll({ limit: 100 }), materialsService.getAll({ limit: 500 })])
      .then(([p, m]) => { setProjects(p.data.data || []); setMaterials(m.data.data || []) })
  }, [])

  useEffect(() => {
    if (watchedFromProject) sitesService.getByProject(watchedFromProject).then(({ data }) => setFromSites(data.data || []))
  }, [watchedFromProject])

  useEffect(() => {
    if (watchedToProject) sitesService.getByProject(watchedToProject).then(({ data }) => setToSites(data.data || []))
  }, [watchedToProject])

  const handleMaterialChange = (index, materialId) => {
    const mat = materials.find((m) => m.id === materialId)
    if (mat) {
      const form = document.querySelector(`[name="items.${index}.unit"]`)
      if (form) form.value = mat.unit
    }
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      await transfersService.create(form)
      toast.success('Transfer completed successfully')
      navigate('/transfers')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-2">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title flex items-center gap-2"><ArrowRightLeft size={24} /> New Stock Transfer</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-800">Transfer Details</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2 text-sm"><span className="w-5 h-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">F</span> From</h4>
                <div className="form-group">
                  <label className="label">Project</label>
                  <select {...register('fromProjectId')} className="input">
                    <option value="">Select project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Site</label>
                  <select {...register('fromSiteId')} className="input" disabled={!watchedFromProject}>
                    <option value="">Select site</option>
                    {fromSites.map((s) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2 text-sm"><span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">T</span> To</h4>
                <div className="form-group">
                  <label className="label">Project</label>
                  <select {...register('toProjectId')} className="input">
                    <option value="">Select project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Site</label>
                  <select {...register('toSiteId')} className="input" disabled={!watchedToProject}>
                    <option value="">Select site</option>
                    {toSites.map((s) => <option key={s.id} value={s.id}>{s.siteName}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="form-group">
                <label className="label">Transfer Date *</label>
                <input {...register('transferDate', { required: 'Required' })} type="date" className="input" />
              </div>
              <div className="form-group">
                <label className="label">Reason</label>
                <input {...register('reason')} className="input" placeholder="Reason for transfer..." />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Materials to Transfer</h3>
            <button type="button" onClick={() => append({ materialId: '', quantity: 1, unit: '' })} className="btn-primary btn-sm">
              <Plus size={14} /> Add Material
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>{['Material', 'Unit', 'Quantity', ''].map((h) => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>)}</tr>
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
                    <td className="px-3 py-2"><input {...register(`items.${idx}.unit`)} className="input py-1.5 w-20" readOnly /></td>
                    <td className="px-3 py-2"><input {...register(`items.${idx}.quantity`, { required: true })} type="number" step="0.001" className="input py-1.5 w-28" /></td>
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
            {saving ? 'Processing...' : 'Execute Transfer'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateTransferPage
