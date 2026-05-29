import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { materialsService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import FilterBar, { FilterSelect } from '../../components/ui/FilterBar'
import { formatNumber } from '../../utils/helpers'
import { Plus, Edit2, Trash2, Package, Tag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const UNIT_OPTIONS = ['Bag', 'KG', 'Ton', 'Piece', 'Liter', 'SqFt', 'CuFt', 'Meter', 'RFT', 'Nos']

const MaterialsPage = () => {
  const { isAdmin, isStoreManager } = useAuth()
  const [data, setData] = useState({ materials: [], total: 0, page: 1 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()
  const catForm = useForm()

  useEffect(() => {
    materialsService.getCategories().then(({ data: d }) => setCategories(d.data || []))
  }, [])

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await materialsService.getAll({ page, limit: 20, search, categoryId: catFilter })
      const d = res.data
      setData({ materials: d.data, total: d.pagination.total, page })
    } catch { toast.error('Failed to load materials') }
    finally { setLoading(false) }
  }, [search, catFilter])

  useEffect(() => { fetchData(1) }, [catFilter])

  const openCreate = () => { setEditItem(null); reset({ unit: 'Bag', minimumStock: 0 }); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    Object.entries({ materialName: item.materialName, categoryId: item.categoryId, unit: item.unit, minimumStock: item.minimumStock, hsnCode: item.hsnCode, description: item.description }).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      if (editItem) { await materialsService.update(editItem.id, form); toast.success('Material updated') }
      else { await materialsService.create(form); toast.success('Material created') }
      setShowModal(false)
      fetchData(data.page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const onCreateCategory = async (form) => {
    setSaving(true)
    try {
      const res = await materialsService.createCategory(form)
      setCategories((prev) => [...prev, res.data.data])
      toast.success('Category created')
      setShowCatModal(false)
      catForm.reset()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await materialsService.remove(deleteItem.id)
      toast.success('Material deleted')
      setDeleteItem(null)
      fetchData(1)
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete') }
    finally { setSaving(false) }
  }

  const columns = [
    { header: '#', key: 'idx', render: (_, __, i) => (data.page - 1) * 20 + i + 1, width: 40 },
    { header: 'Material Name', key: 'materialName', render: (v, row) => <div><p className="font-medium text-gray-900">{v}</p>{row.hsnCode && <p className="text-xs text-gray-500">HSN: {row.hsnCode}</p>}</div> },
    { header: 'Category', key: 'category', render: (v) => <span className="badge-blue">{v?.name}</span> },
    { header: 'Unit', key: 'unit', render: (v) => <span className="badge-gray">{v}</span> },
    { header: 'Min. Stock', key: 'minimumStock', render: (v, row) => `${formatNumber(v, 0)} ${row.unit}` },
    { header: 'Description', key: 'description', render: (v) => v ? v.slice(0, 40) + (v.length > 40 ? '...' : '') : '—' },
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
          <h1 className="page-title flex items-center gap-2"><Package size={24} /> Material Master</h1>
          <p className="page-subtitle">Manage construction materials catalog</p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin() || isStoreManager()) && (
            <button onClick={() => setShowCatModal(true)} className="btn-secondary"><Tag size={15} /> Add Category</button>
          )}
          {(isAdmin() || isStoreManager()) && (
            <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Material</button>
          )}
        </div>
      </div>

      <FilterBar filters={{ catFilter }} onClear={() => setCatFilter('')}>
        <FilterSelect label="Category" value={catFilter} onChange={setCatFilter}
          options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={data.materials}
        total={data.total}
        page={data.page}
        loading={loading}
        onPageChange={(p) => fetchData(p)}
        onSearch={(s) => { setSearch(s); fetchData(1) }}
        searchPlaceholder="Search materials..."
      />

      {/* Material Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Material' : 'Add Material'}
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 form-group">
            <label className="label">Material Name *</label>
            <input {...register('materialName', { required: 'Required' })} className="input" placeholder="e.g., OPC 53 Grade Cement" />
            {errors.materialName && <p className="error-text">{errors.materialName.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Category *</label>
            <select {...register('categoryId', { required: 'Required' })} className="input">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="error-text">{errors.categoryId.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Unit *</label>
            <select {...register('unit', { required: 'Required' })} className="input">
              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Minimum Stock</label>
            <input {...register('minimumStock')} type="number" step="0.001" className="input" placeholder="100" />
          </div>
          <div className="form-group">
            <label className="label">HSN Code</label>
            <input {...register('hsnCode')} className="input" placeholder="2523" />
          </div>
          <div className="col-span-2 form-group">
            <label className="label">Description</label>
            <textarea {...register('description')} rows={2} className="input" />
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Add Category" size="sm"
        footer={<><button onClick={() => setShowCatModal(false)} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={catForm.handleSubmit(onCreateCategory)} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button></>}>
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Category Name *</label>
            <input {...catForm.register('name', { required: 'Required' })} className="input" placeholder="e.g., Cement & Concrete" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea {...catForm.register('description')} rows={2} className="input" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={saving}
        title="Delete Material" message={`Delete "${deleteItem?.materialName}"?`} />
    </div>
  )
}

export default MaterialsPage
