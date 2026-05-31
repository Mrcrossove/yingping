import { get, post, put, del } from '@/utils/request'

export const authApi = {
  login: (data: any) => post('/auth/login', data),
  register: (data: any) => post('/auth/register', data),
  getProfile: () => get('/auth/profile'),
}

export const categoryApi = {
  list: () => get('/categories'),
}

export const productApi = {
  list: (params?: any) => get('/products', params),
  detail: (id: number) => get(`/products/${id}`),
}

export const orderApi = {
  create: (data: any) => post('/orders', data),
  list: (params?: any) => get('/orders', params),
  detail: (id: number) => get(`/orders/${id}`),
  accept: (id: number) => post(`/orders/${id}/accept`),
  dispatchToMaker: (id: number, makerId: number) => post(`/orders/${id}/dispatch-maker`, { makerId }),
  dispatchToDelivery: (id: number, deliveryId: number) => post(`/orders/${id}/dispatch-delivery`, { deliveryId }),
  makerStart: (id: number) => post(`/orders/${id}/maker-start`),
  makerComplete: (id: number) => post(`/orders/${id}/maker-complete`),
  deliveryStart: (id: number) => post(`/orders/${id}/delivery-start`),
  deliveryComplete: (id: number) => post(`/orders/${id}/delivery-complete`),
  manualCreate: (data: any) => post('/orders/manual', data),
}

export const earningApi = {
  myEarnings: (params?: any) => get('/earnings/my', params),
}

export const withdrawalApi = {
  apply: (data: any) => post('/withdrawals/apply', data),
  myWithdrawals: (params?: any) => get('/withdrawals/my', params),
}

export const promotionApi = {
  generateCode: () => post('/promotion/generate-code'),
  myCode: () => get('/promotion/my-code'),
  bindMerchant: (code: string) => post('/promotion/bind', { code }),
}
