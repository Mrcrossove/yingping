import request from '@/utils/request'

export const userApi = {
  list: (params?: any) => request.get('/users', { params }),
  dispatchStaff: (role: 'maker' | 'delivery') => request.get('/users/dispatch-staff', { params: { role } }),
  earningOptions: (params?: any) => request.get('/users/earning-options', { params }),
  merchantDashboard: (params?: any) => request.get('/users/merchant-dashboard', { params }),
  detail: (id: number) => request.get(`/users/${id}`),
  create: (data: any) => request.post('/users', data),
  update: (id: number, data: any) => request.put(`/users/${id}`, data),
  remove: (id: number) => request.delete(`/users/${id}`),
}
