import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { User, Lock, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRoleLabel, formatDateTime } from '../../utils/helpers'

const ProfilePage = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()
  const newPassword = watch('newPassword')

  const onChangePassword = async (data) => {
    setLoading(true)
    try {
      await authService.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      toast.success('Password changed successfully')
      reset()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><User size={16} /> Profile Information</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {initials}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{user?.name}</h3>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', value: user?.name },
              { label: 'Email', value: user?.email },
              { label: 'Mobile', value: user?.mobile || 'Not set' },
              { label: 'Role', value: getRoleLabel(user?.role) },
              { label: 'Account Status', value: user?.status },
              { label: 'Last Login', value: formatDateTime(user?.lastLoginAt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Info */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Shield size={16} /> Access Level</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">{getRoleLabel(user?.role)}</p>
              <p className="text-sm text-blue-600">
                {user?.role === 'ADMIN' && 'Full access to all modules and settings'}
                {user?.role === 'STORE_MANAGER' && 'Manage inventory, purchases, and approvals'}
                {user?.role === 'SITE_ENGINEER' && 'Request materials and view site reports'}
                {user?.role === 'ACCOUNTANT' && 'Manage purchases, billing, and financial reports'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Lock size={16} /> Change Password</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-sm">
            <div className="form-group">
              <label className="label">Current Password</label>
              <input {...register('currentPassword', { required: 'Required' })} type="password" className="input" />
              {errors.currentPassword && <p className="error-text">{errors.currentPassword.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">New Password</label>
              <input {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} type="password" className="input" />
              {errors.newPassword && <p className="error-text">{errors.newPassword.message}</p>}
            </div>
            <div className="form-group">
              <label className="label">Confirm New Password</label>
              <input {...register('confirmPassword', { required: 'Required', validate: (v) => v === newPassword || 'Passwords do not match' })} type="password" className="input" />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
