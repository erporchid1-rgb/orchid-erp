import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  {
    num: '01',
    title: 'Indent / Requisition',
    desc: 'Site Engineer raises a material indent. HOD approves and forwards to Purchase department.',
  },
  {
    num: '02',
    title: 'Comparative Statement',
    desc: 'Purchase team collects quotes from 3+ suppliers and prepares a comparative statement.',
  },
  {
    num: '03',
    title: 'NFA — Note for Approval',
    desc: 'NFA is signed by GM → HOD → CFO → President → Director and approved by MD.',
  },
  {
    num: '04',
    title: 'Purchase Order',
    desc: 'PO is auto-generated from the approved NFA with all supplier and item details pre-filled.',
  },
  {
    num: '05',
    title: 'MRN — Material Receiving',
    desc: 'Store Manager verifies delivery against the PO and records received quantities in MRN.',
  },
]

const LoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-12 flex-col">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-xl bg-white shadow-lg border-2 border-white/20 flex items-center justify-center p-1.5 flex-shrink-0">
            <img src="/logo.png" alt="Orchid Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">Orchid Infrastructure Developers</h1>
            <p className="text-[#c8971f] text-xs font-semibold tracking-widest uppercase">Inspiration of Life</p>
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-3xl font-bold text-white leading-tight mb-2">
          Procurement Workflow
        </h2>
        <p className="text-primary-300 text-sm mb-8">
          5-stage approval process — from indent to material delivery
        </p>

        {/* Steps */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-primary-700" />

            <div className="space-y-6">
              {STEPS.map((step, i) => (
                <div key={step.num} className="flex gap-4 relative">
                  {/* Step number circle */}
                  <div className="w-10 h-10 rounded-full bg-[#c8971f] flex items-center justify-center flex-shrink-0 z-10 shadow-lg">
                    <span className="text-primary-950 text-xs font-bold">{step.num}</span>
                  </div>
                  {/* Content */}
                  <div className={`pt-1.5 pb-1 ${i < STEPS.length - 1 ? '' : ''}`}>
                    <p className="text-white font-semibold text-sm leading-tight">{step.title}</p>
                    <p className="text-primary-300 text-xs mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer tag */}
        <div className="mt-8 pt-6 border-t border-primary-700/50">
          <p className="text-primary-400 text-xs">
            End-to-end construction procurement · Multi-site · Role-based access control
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center mb-8 gap-2">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-primary-200">
              <img src="/logo.png" alt="Orchid" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-gray-900 text-xl font-bold text-center">Orchid Construction ERP System</h1>
            <p className="text-[#c8971f] text-xs font-semibold tracking-widest uppercase">Inspiration of Life</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm mb-8">Enter your credentials to access the ERP system</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="form-group">
                <label className="label">Email address</label>
                <input
                  {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                  type="email"
                  placeholder="admin@orchidconstruction.com"
                  className={`input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  autoComplete="email"
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`input pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-3 bg-primary-50 rounded-xl border border-primary-100">
              <p className="text-xs font-bold text-primary-700 mb-2">Demo Credentials</p>
              <div className="space-y-1 text-[11px] text-primary-700">
                {[
                  ['Admin',            'admin@orchidconstruction.com',       'Admin@123'],
                  ['MD',               'md@orchidconstruction.com',          'Md@123'],
                  ['Exe. Director',    'director@orchidconstruction.com',    'Director@123'],
                  ['President',        'president@orchidconstruction.com',   'President@123'],
                  ['CFO',              'cfo@orchidconstruction.com',         'Cfo@123'],
                  ['Dy. Manager Purchase (Sumit)', 'gm.purchase@orchidconstruction.com', 'GmPurchase@123'],
                  ['HOD Purchase (Gagan)',        'purchase.hod@orchidconstruction.com','PurchaseHod@123'],
                  ['User HOD',         'user.hod@orchidconstruction.com',    'UserHod@123'],
                  ['Store Manager',    'store@orchidconstruction.com',       'Store@123'],
                  ['Site Engineer',    'engineer@orchidconstruction.com',    'Engineer@123'],
                ].map(([role, email, pass]) => (
                  <div key={role} className="flex items-center justify-between gap-2 py-0.5 border-b border-primary-100 last:border-0">
                    <span className="text-primary-500 w-24 flex-shrink-0">{role}</span>
                    <span className="font-mono text-primary-700 truncate flex-1">{email}</span>
                    <span className="font-mono font-semibold text-primary-900 flex-shrink-0">{pass}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Orchid Construction Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
