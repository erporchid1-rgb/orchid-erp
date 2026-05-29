import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    if (!token) { setLoading(false); return }
    try {
      if (storedUser) setUser(JSON.parse(storedUser))
      const { data } = await authService.getProfile()
      setUser(data.data)
      localStorage.setItem('user', JSON.stringify(data.data))
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await authService.login(email, password)
    const { user: userData, accessToken, refreshToken } = data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await authService.logout(refreshToken)
    } catch {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const hasRole = (...roles) => roles.includes(user?.role)
  const isAdmin = () => user?.role === 'ADMIN'
  const isStoreManager = () => ['ADMIN', 'STORE_MANAGER'].includes(user?.role)
  const canApprove = () => ['ADMIN', 'STORE_MANAGER'].includes(user?.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, isAdmin, isStoreManager, canApprove, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
