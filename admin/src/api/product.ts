import request from '@/utils/request'

export const categoryApi = {
  list: () => request.get('/categories'),
  create: (data: any) => request.post('/categories', data),
  update: (id: number, data: any) => request.put(`/categories/${id}`, data),
  remove: (id: number) => request.delete(`/categories/${id}`),
}

export const productApi = {
  list: (params?: any) => request.get('/products', { params }),
  detail: (id: number) => request.get(`/products/${id}`),
  create: (data: any) => request.post('/products', data),
  update: (id: number, data: any) => request.put(`/products/${id}`, data),
  remove: (id: number) => request.delete(`/products/${id}`),
}
