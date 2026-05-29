import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { suppliersService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { TruckIcon, Plus, Edit2, Trash2, Phone, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const SuppliersPage = () => {
  const { isAdmin, isStoreManager } = useAuth()
  const [data, setData] = useState({ suppliers: [], total: 0, page: 1 })
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
      const res = await suppliersService.getAll({ page, limit: 20, search: searchVal })
      const d = res.data
      setData({ suppliers: d.data, total: d.pagination.total, page })
    } catch { toast.error('Failed to load suppliers') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchData(1) }, [])

  const openCreate = () => { setEditItem(null); reset(); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    Object.entries({ supplierName: item.supplierName, mobile: item.mobile, email: item.email, address: item.address, gstNumber: item.gstNumber, panNumber: item.panNumber, bankAccount: item.bankAccount, bankIfsc: item.bankIfsc, bankName: item.bankName }).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      if (editItem) { await suppliersService.update(editItem.id, form); toast.success('Supplier updated') }
      else { await suppliersService.create(form); toast.success('Supplier created') }
      setShowModal(false)
      fetchData(data.page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await suppliersService.remove(deleteItem.id)
      toast.success('Supplier removed')
      setDeleteItem(null)
      fetchData(1)
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete') }
    finally { setSaving(false) }
  }

  const columns = [
    { header: '#', key: 'idx', render: (_, __, i) => (data.page - 1) * 20 + i + 1, width: 40 },
    {
      header: 'Supplier', key: 'supplierName', render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900">{v}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {row.mobile && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{row.mobile}</span>}
            {row.email && <span className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} />{row.email}</span>}
          </div>
        </div>
      )
    },
    { header: 'GST Number', key: 'gstNumber', render: (v) => v ? <span className="font-mono text-xs">{v}</span> : '—' },
    { header: 'Address', key: 'address', render: (v) => v ? v.slice(0, 40) + (v.length > 40 ? '...' : '') : '—' },
    { header: 'Purchases', key: '_count', render: (v) => <span className="badge-blue">{v?.purchases || 0}</span> },
    { header: 'Status', key: 'isActive', render: (v) => <span className={v ? 'badge-green' : 'badge-red'}>{v ? 'Active' : 'Inactive'}</span> },
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
          <h1 className="page-title flex items-center gap-2"><TruckIcon size={24} /> Suppliers</h1>
          <p className="page-subtitle">Manage vendor and supplier information</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Supplier</button>
      </div>

      <DataTable columns={columns} data={data.suppliers} total={data.total} page={data.page} loading={loading}
        onPageChange={(p) => fetchData(p)} onSearch={(s) => { setSearch(s); fetchData(1, s) }} searchPlaceholder="Search suppliers..." />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Supplier' : 'Add Supplier'} size="lg"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 form-group">
            <label className="label">Supplier Name *</label>
            <input {...register('supplierName', { required: 'Required' })} className="input" />
            {errors.supplierName && <p className="error-text">{errors.supplierName.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Mobile *</label>
            <input {...register('mobile', { required: 'Required' })} className="input" />
            {errors.mobile && <p className="error-text">{errors.mobile.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" />
          </div>
          <div className="form-group">
            <label className="label">GST Number</label>
            <input {...register('gstNumber')} className="input font-mono" />
          </div>
          <div className="form-group">
            <label className="label">PAN Number</label>
            <input {...register('panNumber')} className="input font-mono" />
          </div>
          <div className="col-span-2 form-group">
            <label className="label">Address</label>
            <textarea {...register('address')} rows={2} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Bank Name</label>
            <input {...register('bankName')} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Account Number</label>
            <input {...register('bankAccount')} className="input font-mono" />
          </div>
          <div className="form-group">
            <label className="label">IFSC Code</label>
            <input {...register('bankIfsc')} className="input font-mono" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={saving}
        title="Remove Supplier" message={`Remove "${deleteItem?.supplierName}" from the system?`} />
    </div>
  )
}

export default SuppliersPage
