import { get, post, put, del } from '@/utils/request'

export const authApi = {
  login: (data: any) => post('/auth/login', data),
  wxLogin: (code: string) => post('/auth/wx-login', { code }),
  register: (data: any) => post('/auth/register', data),
  getProfile: () => get('/auth/profile'),
  bindPhone: (phone: string) => post('/auth/bind-phone', { phone }),
}

export const categoryApi = {
  list: () => get('/categories'),
}

export const productApi = {
  list: (params?: any) => get('/products', params),
  detail: (id: number) => get(`/products/${id}`),
}

export const userApi = {
  dispatchStaff: (role: 'maker' | 'delivery') => get('/users/dispatch-staff', { role }),
  merchants: (params?: any) => get('/users/merchants', params),
  myMerchantProfile: () => get('/users/me/merchant-profile'),
  updateMyMerchantProfile: (data: any) => put('/users/me/merchant-profile', data),
}

export const bannerApi = {
  list: () => get('/banners/public'),
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
  cancel: (id: number) => post(`/orders/${id}/cancel`),
  manualCreate: (data: any) => post('/orders/manual', data),
}

export const addressApi = {
  list: () => get('/addresses'),
  create: (data: any) => post('/addresses', data),
  update: (id: number, data: any) => put(`/addresses/${id}`, data),
  remove: (id: number) => del(`/addresses/${id}`),
  setDefault: (id: number) => post(`/addresses/${id}/default`),
}

export const locationApi = {
  reverseGeocode: (data: { latitude: number; longitude: number }) => post('/location/reverse-geocode', data),
}

export const settingApi = {
  publicSettings: () => get('/settings/public'),
}

export const paymentApi = {
  create: (orderId: number) => post(`/payments/create/${orderId}`),
  jsapi: (orderId: number, openid?: string) => post(`/payments/jsapi/${orderId}`, { openid }),
  requestRefund: (orderId: number) => post(`/payments/request-refund/${orderId}`),
}

export const reviewApi = {
  create: (data: { orderId: number; rating: number; content?: string }) => post('/reviews', data),
  byOrder: (orderId: number) => get(`/reviews/order/${orderId}`),
  my: (params?: any) => get('/reviews/my', params),
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
  wxacode: () => get('/promotion/wxacode'),
  commissionDetails: (params?: any) => get('/promotion/commission-details', params),
  uploadMerchant: (data: any) => post('/promotion/upload-merchant', data),
  myMerchantLeads: (params?: any) => get('/promotion/my-merchant-leads', params),
}
