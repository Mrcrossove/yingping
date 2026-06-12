import request from '@/utils/request'
import { compressImageFile } from '@/utils/image'

export { authApi } from './auth'
export { userApi } from './user'
export { productApi, categoryApi } from './product'
export { orderApi } from './order'

export const commissionApi = {
  list: (params?: any) => request.get('/commissions', { params }),
  setProductRules: (productId: number, rules: any[]) =>
    request.post(`/commissions/product/${productId}`, { rules }),
  deleteRule: (id: number) => request.delete(`/commissions/${id}`),
}

export const permissionApi = {
  list: () => request.get('/permissions'),
  initDefaults: () => request.post('/permissions/init'),
  getAdminPermissions: (adminId: number) => request.get(`/permissions/admin/${adminId}`),
  setAdminPermissions: (adminId: number, permissionIds: number[]) =>
    request.post(`/permissions/admin/${adminId}`, { permissionIds }),
}

export const earningApi = {
  myEarnings: (params?: any) => request.get('/earnings/my', { params }),
  allEarnings: (params?: any) => request.get('/earnings', { params }),
}

export const withdrawalApi = {
  apply: (data: any) => request.post('/withdrawals/apply', data),
  myWithdrawals: (params?: any) => request.get('/withdrawals/my', { params }),
  allWithdrawals: (params?: any) => request.get('/withdrawals', { params }),
  approve: (id: number) => request.post(`/withdrawals/${id}/approve`),
  reject: (id: number, remark: string) => request.post(`/withdrawals/${id}/reject`, { remark }),
  markPaid: (id: number) => request.post(`/withdrawals/${id}/mark-paid`),
  batchApprove: (ids: number[]) => request.post('/withdrawals/batch-approve', { ids }),
}

export const promotionApi = {
  generateCode: () => request.post('/promotion/generate-code'),
  myCode: () => request.get('/promotion/my-code'),
  bindings: (params?: any) => request.get('/promotion/bindings', { params }),
  codes: (params?: any) => request.get('/promotion/codes', { params }),
  wxacode: () => request.get('/promotion/wxacode'),
  commissionDetails: (params?: any) => request.get('/promotion/commission-details', { params }),
  summary: () => request.get('/promotion/summary'),
  merchantLeads: (params?: any) => request.get('/promotion/merchant-leads', { params }),
  updateMerchantLeadStatus: (id: number, status: string) =>
    request.put(`/promotion/merchant-leads/${id}/status`, { status }),
}

export const paymentApi = {
  refund: (orderId: number) => request.post(`/payments/refund/${orderId}`),
}

export const dashboardApi = {
  stats: () => request.get('/dashboard/stats'),
  trend: (days?: number) => request.get('/dashboard/trend', { params: { days } }),
  earningsSummary: () => request.get('/dashboard/earnings-summary'),
  lowStock: () => request.get('/dashboard/low-stock'),
}

export const notificationApi = {
  list: (params?: any) => request.get('/notifications', { params }),
  markRead: (id: number) => request.post(`/notifications/${id}/read`),
  markAllRead: () => request.post('/notifications/read-all'),
}

import { API_BASE_URL } from '@/config'

export const exportApi = {
  orders: (params?: any) => `${API_BASE_URL}/api/export/orders?${new URLSearchParams(params || {}).toString()}`,
  earnings: (params?: any) => `${API_BASE_URL}/api/export/earnings?${new URLSearchParams(params || {}).toString()}`,
  withdrawals: () => `${API_BASE_URL}/api/export/withdrawals`,
}

async function downloadExcel(url: string, filename: string, params?: any) {
  const blob = await request.get<Blob>(url, {
    params,
    responseType: 'blob',
  })
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

export const downloadApi = {
  orders: (params?: any) => downloadExcel('/export/orders', 'orders.xlsx', params),
  earnings: (params?: any) => downloadExcel('/export/earnings', 'earnings.xlsx', params),
  withdrawals: () => downloadExcel('/export/withdrawals', 'withdrawals.xlsx'),
}

export const fileApi = {
  upload: async (file: File) => {
    const uploadFile = await compressImageFile(file)
    const formData = new FormData()
    formData.append('file', uploadFile)
    return request.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const bannerApi = {
  list: (params?: any) => request.get('/banners', { params }),
  create: (data: any) => request.post('/banners', data),
  update: (id: number, data: any) => request.put(`/banners/${id}`, data),
  remove: (id: number) => request.delete(`/banners/${id}`),
}

export const settingApi = {
  get: () => request.get('/settings'),
  updateCustomerServicePhone: (phone: string) =>
    request.put('/settings/customer-service-phone', { phone }),
}
