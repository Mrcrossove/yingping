import request from '@/utils/request'

export const userApi = {
  list: (params?: any) => request.get('/users', { params }),
  detail: (id: number) => request.get(`/users/${id}`),
  create: (data: any) => request.post('/users', data),
  update: (id: number, data: any) => request.put(`/users/${id}`, data),
  remove: (id: number) => request.delete(`/users/${id}`),
}
