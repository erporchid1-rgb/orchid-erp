import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Package, BarChart2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

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

  const features = [
    { icon: Package, label: 'Material Tracking' },
    { icon: BarChart2, label: 'Real-time Reports' },
    { icon: ShieldCheck, label: 'Role-based Access' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-12 flex-col justify-between">
        <div>
          {/* Large centered logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-36 h-36 rounded-2xl bg-white shadow-xl mb-5 border-4 border-white/20 flex items-center justify-center p-2">
              <img src="/logo.png" alt="Orchid Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-white text-2xl font-bold text-center leading-tight">Orchid Construction</h1>
            <p className="text-[#c8971f] text-sm font-semibold tracking-widest uppercase mt-1">Inspiration of Life</p>
            <div className="w-16 h-0.5 bg-[#c8971f] rounded-full mt-3 opacity-70" />
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            Complete Construction<br />Inventory Management
          </h2>
          <p className="text-primary-200 text-base leading-relaxed mb-8">
            Track materials, manage stock movements, monitor site consumption, and generate detailed reports — all in one place.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-primary-100">
                <div className="w-8 h-8 bg-primary-700/60 rounded-lg flex items-center justify-center border border-primary-600">
                  <Icon size={16} />
                </div>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary-800/50 rounded-2xl p-6 border border-primary-700">
          <p className="text-primary-100 text-sm italic leading-relaxed">
            "Managing inventory across multiple construction sites has never been easier. Full traceability from purchase to site consumption."
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#c8971f] rounded-full flex items-center justify-center text-primary-900 font-bold text-xs">RK</div>
            <div>
              <p className="text-white text-sm font-medium">Rajesh Kumar</p>
              <p className="text-primary-300 text-xs">Store Manager, Orchid Construction</p>
            </div>
          </div>
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
            <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
              <p className="text-xs font-semibold text-primary-700 mb-2">Demo Credentials</p>
              <div className="space-y-1.5 text-xs text-primary-600">
                <p>Admin: <span className="font-mono font-semibold">admin@orchidconstruction.com</span> / <span className="font-mono">Admin@123</span></p>
                <p>Store: <span className="font-mono font-semibold">store@orchidconstruction.com</span> / <span className="font-mono">Store@123</span></p>
                <p className="text-gray-400 text-[10px] pt-1 border-t border-primary-100">Run <span className="font-mono">node prisma/seed.js</span> in backend to create these accounts</p>
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
