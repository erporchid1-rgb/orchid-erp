import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { projectsService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatDate, formatCurrency, getStatusBadge } from '../../utils/helpers'
import { Plus, Edit2, Trash2, FolderKanban, Eye } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']
const TYPE_OPTIONS = [{ value: 'THREE_BHK', label: '3 BHK' }, { value: 'FOUR_BHK', label: '4 BHK' }, { value: 'COMMERCIAL', label: 'Commercial' }, { value: 'OTHER', label: 'Other' }]

const ProjectsPage = () => {
  const { isAdmin, isStoreManager } = useAuth()
  const [data, setData] = useState({ projects: [], total: 0, page: 1, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  const fetchData = useCallback(async (page = 1, searchVal = search) => {
    setLoading(true)
    try {
      const res = await projectsService.getAll({ page, limit: 20, search: searchVal })
      const d = res.data
      setData({ projects: d.data, total: d.pagination.total, page, limit: 20 })
    } catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchData(1) }, [])

  const openCreate = () => { setEditItem(null); reset({ status: 'ACTIVE', projectType: 'THREE_BHK' }); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    setValue('projectName', item.projectName)
    setValue('location', item.location)
    setValue('projectType', item.projectType)
    setValue('status', item.status)
    setValue('startDate', item.startDate?.split('T')[0])
    setValue('budget', item.budget)
    setValue('description', item.description)
    setShowModal(true)
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      if (editItem) {
        await projectsService.update(editItem.id, form)
        toast.success('Project updated')
      } else {
        await projectsService.create(form)
        toast.success('Project created')
      }
      setShowModal(false)
      fetchData(data.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save project')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await projectsService.remove(deleteItem.id)
      toast.success('Project deleted')
      setDeleteItem(null)
      fetchData(1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete project')
    } finally { setSaving(false) }
  }

  const columns = [
    { header: '#', key: 'idx', render: (_, __, i) => (data.page - 1) * 20 + i + 1, width: 40 },
    { header: 'Project Name', key: 'projectName', render: (v, row) => <div><p className="font-medium text-gray-900">{v}</p><p className="text-xs text-gray-500">{row.location}</p></div> },
    { header: 'Type', key: 'projectType', render: (v) => <span className="badge-blue">{v?.replace('_', ' ')}</span> },
    { header: 'Sites', key: 'sites', render: (v) => <span className="badge-gray">{v?.length || 0} sites</span> },
    { header: 'Start Date', key: 'startDate', render: (v) => formatDate(v) },
    { header: 'Budget', key: 'budget', render: (v) => v ? formatCurrency(v) : '—' },
    { header: 'Status', key: 'status', render: (v) => <span className={getStatusBadge(v)}>{v}</span> },
    {
      header: 'Actions', key: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={14} /></button>
          {isAdmin() && <button onClick={() => setDeleteItem(row)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>}
        </div>
      )
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><FolderKanban size={24} /> Projects</h1>
          <p className="page-subtitle">Manage construction projects</p>
        </div>
        {(isAdmin() || isStoreManager()) && (
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Project</button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data.projects}
        total={data.total}
        page={data.page}
        limit={data.limit}
        loading={loading}
        onPageChange={(p) => fetchData(p)}
        onSearch={(s) => { setSearch(s); fetchData(1, s) }}
        searchPlaceholder="Search projects..."
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Project' : 'Add New Project'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 form-group">
            <label className="label">Project Name *</label>
            <input {...register('projectName', { required: 'Required' })} className="input" placeholder="e.g., SkyView Residency" />
            {errors.projectName && <p className="error-text">{errors.projectName.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Project Type</label>
            <select {...register('projectType')} className="input">
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select {...register('status')} className="input">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2 form-group">
            <label className="label">Location *</label>
            <input {...register('location', { required: 'Required' })} className="input" placeholder="e.g., Andheri West, Mumbai" />
            {errors.location && <p className="error-text">{errors.location.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Start Date *</label>
            <input {...register('startDate', { required: 'Required' })} type="date" className="input" />
            {errors.startDate && <p className="error-text">{errors.startDate.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Budget (₹)</label>
            <input {...register('budget')} type="number" className="input" placeholder="50000000" />
          </div>
          <div className="col-span-2 form-group">
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3} className="input" placeholder="Project description..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteItem?.projectName}"? This action cannot be undone.`}
      />
    </div>
  )
}

export default ProjectsPage
