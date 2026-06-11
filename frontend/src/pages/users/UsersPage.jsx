import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { usersService } from '../../services'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatDateTime, getStatusBadge, getRoleBadge, getRoleLabel } from '../../utils/helpers'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ROLES = [
  'ADMIN', 'MD', 'EXE_DIRECTOR', 'PRESIDENT_PROJECTS', 'CFO',
  'GM_PURCHASE', 'PURCHASE_HOD', 'USER_HOD', 'INCHARGE',
  'STORE_MANAGER', 'FINANCE', 'ACCOUNTANT', 'SITE_ENGINEER',
]

const UsersPage = () => {
  const { user: currentUser } = useAuth()
  const [data, setData] = useState({ users: [], total: 0, page: 1 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  const fetchData = useCallback(async (page = 1, search = '') => {
    setLoading(true)
    try {
      const res = await usersService.getAll({ page, limit: 20, search })
      setData({ users: res.data.data, total: res.data.pagination.total, page })
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(1) }, [])

  const openCreate = () => { setEditItem(null); reset({ role: 'SITE_ENGINEER', status: 'ACTIVE' }); setShowModal(true) }
  const openEdit = (item) => {
    setEditItem(item)
    Object.entries({ name: item.name, email: item.email, mobile: item.mobile, role: item.role, status: item.status }).forEach(([k, v]) => setValue(k, v))
    setShowModal(true)
  }

  const onSubmit = async (form) => {
    setSaving(true)
    try {
      if (editItem) { await usersService.update(editItem.id, form); toast.success('User updated') }
      else { await usersService.create(form); toast.success('User created') }
      setShowModal(false)
      fetchData(data.page)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await usersService.remove(deleteItem.id)
      toast.success('User deleted')
      setDeleteItem(null)
      fetchData(1)
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete') }
    finally { setSaving(false) }
  }

  const columns = [
    { header: '#', key: 'idx', render: (_, __, i) => (data.page - 1) * 20 + i + 1, width: 40 },
    { header: 'Name', key: 'name', render: (v, row) => <div><p className="font-medium text-gray-900">{v}</p><p className="text-xs text-gray-500">{row.email}</p></div> },
    { header: 'Mobile', key: 'mobile', render: (v) => v || '—' },
    { header: 'Role', key: 'role', render: (v) => <span className={getRoleBadge(v)}>{getRoleLabel(v)}</span> },
    { header: 'Status', key: 'status', render: (v) => <span className={getStatusBadge(v)}>{v}</span> },
    { header: 'Last Login', key: 'lastLoginAt', render: (v) => v ? formatDateTime(v) : 'Never' },
    {
      header: 'Actions', key: 'id', render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
          {row.id !== currentUser?.id && <button onClick={() => setDeleteItem(row)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>}
        </div>
      )
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={24} /> Users</h1>
          <p className="page-subtitle">Manage system users and access roles</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add User</button>
      </div>

      <DataTable columns={columns} data={data.users} total={data.total} page={data.page} loading={loading}
        onPageChange={(p) => fetchData(p)} onSearch={(s) => fetchData(1, s)} searchPlaceholder="Search users..." />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit User' : 'Add User'}
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Cancel</button><button onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editItem ? 'Update' : 'Create'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 form-group">
            <label className="label">Full Name *</label>
            <input {...register('name', { required: 'Required' })} className="input" />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Email *</label>
            <input {...register('email', { required: 'Required' })} type="email" className="input" />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>
          <div className="form-group">
            <label className="label">Mobile</label>
            <input {...register('mobile')} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Role *</label>
            <select {...register('role', { required: 'Required' })} className="input">
              {ROLES.map((r) => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select {...register('status')} className="input">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          {!editItem && (
            <div className="col-span-2 form-group">
              <label className="label">Password *</label>
              <input {...register('password', { required: !editItem && 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} type="password" className="input" />
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={saving}
        title="Delete User" message={`Delete user "${deleteItem?.name}"? This action cannot be undone.`} />
    </div>
  )
}

export default UsersPage
