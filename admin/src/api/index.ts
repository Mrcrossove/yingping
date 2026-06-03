import request from '@/utils/request'

export { authApi } from './auth'
export { userApi } from './user'
export { productApi, categoryApi } from './product'
export { orderApi } from './order'

export const commissionApi = {
  list: () => request.get('/commissions'),
  setRule: (data: { categoryId: number; role: string; percentage: number }) =>
    request.post('/commissions', data),
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
}

import { API_BASE_URL } from '@/config'

export const exportApi = {
  orders: (params?: any) => `${API_BASE_URL}/api/export/orders?${new URLSearchParams(params || {}).toString()}`,
  earnings: () => `${API_BASE_URL}/api/export/earnings`,
  withdrawals: () => `${API_BASE_URL}/api/export/withdrawals`,
}

export const fileApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
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
