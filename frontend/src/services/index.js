import api from './api'

const buildService = (resource) => ({
  getAll: (params) => api.get(`/${resource}`, { params }),
  getById: (id) => api.get(`/${resource}/${id}`),
  create: (data) => api.post(`/${resource}`, data),
  update: (id, data) => api.put(`/${resource}/${id}`, data),
  remove: (id) => api.delete(`/${resource}/${id}`),
})

export const projectsService = {
  ...buildService('projects'),
  getStats: (id) => api.get(`/projects/${id}/stats`),
}

export const sitesService = {
  ...buildService('sites'),
  getByProject: (projectId) => api.get(`/sites/by-project/${projectId}`),
}

export const materialsService = {
  ...buildService('materials'),
  getCategories: () => api.get('/materials/categories'),
  createCategory: (data) => api.post('/materials/categories', data),
}

export const suppliersService = {
  ...buildService('suppliers'),
  getPurchaseHistory: (id, params) => api.get(`/suppliers/${id}/purchases`, { params }),
}

export const purchasesService = {
  ...buildService('purchases'),
  updateStatus: (id, status) => api.patch(`/purchases/${id}/status`, { status }),
  submitForApproval: (id) => api.patch(`/purchases/${id}/submit`),
  approve: (id, notes) => api.patch(`/purchases/${id}/approve`, { notes }),
  reject: (id, notes) => api.patch(`/purchases/${id}/reject`, { notes }),
  uploadInvoice: (id, formData) => api.post(`/purchases/${id}/invoice`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadQuotation: (id, num, formData) => api.post(`/purchases/${id}/quotation/${num}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getPDF: (id) => api.get(`/purchases/${id}/pdf`, { responseType: 'blob' }),
}

export const indentsService = {
  getAll: (params) => api.get('/indents', { params }),
  getById: (id) => api.get(`/indents/${id}`),
  create: (data) => api.post('/indents', data),
  approve: (id, notes) => api.patch(`/indents/${id}/approve`, { notes }),
  reject: (id, notes) => api.patch(`/indents/${id}/reject`, { notes }),
}

export const stockService = {
  getCurrent: (params) => api.get('/stock/current', { params }),
  getSummary: () => api.get('/stock/summary'),
  getLowStock: () => api.get('/stock/low-stock'),
  getLedger: (materialId, params) => api.get(`/stock/ledger/${materialId}`, { params }),
  getSiteStock: (siteId) => api.get(`/stock/site/${siteId}`),
  addOpeningStock: (data) => api.post('/stock/opening', data),
}

export const issuesService = {
  ...buildService('issues'),
  approve: (id) => api.patch(`/issues/${id}/approve`),
  reject: (id, remarks) => api.patch(`/issues/${id}/reject`, { remarks }),
}

export const transfersService = {
  ...buildService('transfers'),
}

export const reportsService = {
  getDashboard: () => api.get('/reports/dashboard'),
  getCurrentStock: (params) => api.get('/reports/current-stock', { params }),
  getLowStock: () => api.get('/reports/low-stock'),
  getSupplierPurchases: (params) => api.get('/reports/supplier-purchases', { params }),
  getSiteConsumption: (params) => api.get('/reports/site-consumption', { params }),
  getDailyPurchases: (params) => api.get('/reports/daily-purchases', { params }),
  getMonthlyUsage: (year) => api.get('/reports/monthly-usage', { params: { year } }),
}

export const usersService = {
  ...buildService('users'),
}

export const notificationsService = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
}
