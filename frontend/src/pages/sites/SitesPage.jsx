import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { sitesService, projectsService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatDate } from '../../utils/helpers'
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const SitesPage = () => {
  const { isAdmin, isStoreManager } = useAuth()
  const [data, setData] = useState({ sites: [], total: 0, page: 1 })
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    projectsService.getAll({ limit: 100 }).then(({ data: d }) => setProjects(d.data || []))
  }, [])

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await sitesService.getAll({ page, limit: 20, search, projectId: projectFilter })
      const d = res.data
      setData({ sites: d.data, total: d.pagination.total, page })
    } catch { toast.error('Failed to load sites') }
    finally { setLoading(false) }
  }, [search, projectFilter])

  useEffect(() => { fetchData(1) }, [projectFilter])

  const openCreate = () => { setEditItem(null); reset(); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    setValue('siteName', item.siteName)
    setValue('projectId', item.projectId)
    setValue('description', item.description)
    setValue('address', item.address)
    setShowModal(true)
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      if (editItem) { await sitesService.update(editItem.id, form); toast.success('Site updated') }
      else { await sitesService.create(form); toast.success('Site created') }
      setShowModal(false)
      fetchData(data.page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save site') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await sitesService.remove(deleteItem.id)
      toast.success('Site deleted')
      setDeleteItem(null)
      fetchData(1)
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete site') }
    finally { setSaving(false) }
  }

  const columns = [
    { header: '#', key: 'idx', render: (_, __, i) => (data.page - 1) * 20 + i + 1, width: 40 },
    { header: 'Site Name', key: 'siteName', render: (v) => <p className="font-medium text-gray-900">{v}</p> },
    { header: 'Project', key: 'project', render: (v) => <span className="badge-blue">{v?.projectName || '—'}</span> },
    { header: 'Description', key: 'description', render: (v) => v || '—' },
    { header: 'Address', key: 'address', render: (v) => v || '—' },
    { header: 'Created', key: 'createdAt', render: (v) => formatDate(v) },
    {
      header: 'Actions', key: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
          {isAdmin() && <button onClick={() => setDeleteItem(row)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>}
        </div>
      )
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><MapPin size={24} /> Sites / Blocks</h1>
          <p className="page-subtitle">Manage project sites and blocks</p>
        </div>
        {(isAdmin() || isStoreManager()) && (
          <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Site</button>
        )}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="label mb-0">Filter by Project:</label>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="input py-1.5 text-sm min-w-[180px]">
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data.sites}
        total={data.total}
        page={data.page}
        loading={loading}
        onPageChange={(p) => fetchData(p)}
        onSearch={(s) => { setSearch(s); fetchData(1) }}
        searchPlaceholder="Search sites..."
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Site' : 'Add New Site'}
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button></>}>
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Site Name *</label>
            <input {...register('siteName', { required: 'Required' })} className="input" placeholder="e.g., Tower A" />
            {errors.siteName && <p className="error-text">{errors.siteName.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Project *</label>
            <select {...register('projectId', { required: 'Required' })} className="input">
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
            </select>
            {errors.projectId && <p className="error-text">{errors.projectId.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Address</label>
            <input {...register('address')} className="input" placeholder="Site address" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3} className="input" placeholder="Site description..." />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={saving}
        title="Delete Site" message={`Delete "${deleteItem?.siteName}"? This action cannot be undone.`} />
    </div>
  )
}

export default SitesPage
