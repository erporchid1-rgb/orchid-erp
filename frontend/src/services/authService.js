import api from './api'

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
}
