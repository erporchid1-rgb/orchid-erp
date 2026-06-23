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
  update: (id, data) => api.put(`/indents/${id}`, data),
  submitToHOD: (id) => api.patch(`/indents/${id}/submit`),
  hodAction: (id, action, notes) => api.patch(`/indents/${id}/hod-action`, { action, notes }),
  purchaseAction: (id, action, notes) => api.patch(`/indents/${id}/purchase-action`, { action, notes }),
}

export const comparativeService = {
  getAll: (params) => api.get('/comparative', { params }),
  getById: (id) => api.get(`/comparative/${id}`),
  create: (data) => api.post('/comparative', data),
  update: (id, data) => api.put(`/comparative/${id}`, data),
  addQuotation: (id, data) => api.post(`/comparative/${id}/quotations`, data),
  uploadQuotationFile: (id, quotationId, formData) =>
    api.post(`/comparative/${id}/quotations/${quotationId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  selectSupplier: (id, supplierId) => api.patch(`/comparative/${id}/select-supplier`, { supplierId }),
  hodRecommend: (id, notes) => api.patch(`/comparative/${id}/hod-recommend`, { notes }),
  userVerify: (id, notes, supplierId) => api.patch(`/comparative/${id}/user-verify`, { notes, supplierId }),
  presidentVerify: (id, notes, supplierId) => api.patch(`/comparative/${id}/president-verify`, { notes, supplierId }),
}

export const nfaService = {
  getAll: (params) => api.get('/nfa', { params }),
  getById: (id) => api.get(`/nfa/${id}`),
  create: (data) => api.post('/nfa', data),
  update: (id, data) => api.put(`/nfa/${id}`, data),
  uploadDraftPO: (id, formData) =>
    api.post(`/nfa/${id}/upload-draft-po`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sign: (id, action, signature) => api.patch(`/nfa/${id}/sign`, { action, signature }),
  mdAction: (id, action, notes, signature) => api.patch(`/nfa/${id}/md-action`, { action, notes, signature, approvalMode: 'DIGITAL' }),
  mdRecordAction: (id, action, notes, approvalMode) => api.patch(`/nfa/${id}/md-action`, { action, notes, approvalMode }),
}

export const mrnService = {
  getAll: (params) => api.get('/mrn', { params }),
  getById: (id) => api.get(`/mrn/${id}`),
  create: (data) => api.post('/mrn', data),
  uploadDocument: (id, docType, formData) =>
    api.post(`/mrn/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, params: { docType } }),
  storeVerify: (id) => api.patch(`/mrn/${id}/store-verify`),
  purchaseVerify: (id) => api.patch(`/mrn/${id}/purchase-verify`),
  closePO: (id) => api.patch(`/mrn/${id}/close-po`),
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
  getMyPending: () => api.get('/reports/my-pending'),
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
