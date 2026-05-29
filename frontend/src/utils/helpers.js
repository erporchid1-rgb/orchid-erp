export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount || 0)
}

export const formatNumber = (num, decimals = 2) => {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(num || 0)
}

export const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const getStatusBadge = (status) => {
  const map = {
    ACTIVE: 'badge-green', COMPLETED: 'badge-blue', PLANNING: 'badge-yellow', ON_HOLD: 'badge-gray',
    RECEIVED: 'badge-green', CONFIRMED: 'badge-blue', DRAFT: 'badge-gray', CANCELLED: 'badge-red',
    ISSUED: 'badge-green', APPROVED: 'badge-blue', PENDING: 'badge-yellow', REJECTED: 'badge-red',
    INACTIVE: 'badge-red',
  }
  return map[status] || 'badge-gray'
}

export const getRoleBadge = (role) => {
  const map = { ADMIN: 'badge-purple', STORE_MANAGER: 'badge-blue', SITE_ENGINEER: 'badge-green', ACCOUNTANT: 'badge-yellow' }
  return map[role] || 'badge-gray'
}

export const getRoleLabel = (role) => {
  const map = { ADMIN: 'Admin', STORE_MANAGER: 'Store Manager', SITE_ENGINEER: 'Site Engineer', ACCOUNTANT: 'Accountant' }
  return map[role] || role
}

export const getMovementTypeLabel = (type) => {
  const map = { PURCHASE: 'Purchase', ISSUE: 'Issue', RETURN: 'Return', DAMAGE: 'Damage', TRANSFER_IN: 'Transfer In', TRANSFER_OUT: 'Transfer Out', ADJUSTMENT: 'Adjustment' }
  return map[type] || type
}

export const getMovementTypeColor = (type) => {
  const positive = ['PURCHASE', 'RETURN', 'TRANSFER_IN', 'ADJUSTMENT']
  return positive.includes(type) ? 'text-green-600' : 'text-red-600'
}

export const truncate = (text, maxLen = 30) => {
  if (!text) return 'N/A'
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
