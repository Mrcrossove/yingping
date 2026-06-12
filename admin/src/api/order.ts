import request from '@/utils/request'

export const orderApi = {
  list: (params?: any) => request.get('/orders', { params }),
  detail: (id: number) => request.get(`/orders/${id}`),
  accept: (id: number) => request.post(`/orders/${id}/accept`),
  dispatchBoth: (id: number, makerId: number, deliveryId: number) =>
    request.post(`/orders/${id}/dispatch-both`, { makerId, deliveryId }),
  dispatchToMaker: (id: number, makerId: number) =>
    request.post(`/orders/${id}/dispatch-maker`, { makerId }),
  makerStart: (id: number) => request.post(`/orders/${id}/maker-start`),
  makerComplete: (id: number) => request.post(`/orders/${id}/maker-complete`),
  dispatchToDelivery: (id: number, deliveryId: number) =>
    request.post(`/orders/${id}/dispatch-delivery`, { deliveryId }),
  deliveryStart: (id: number) => request.post(`/orders/${id}/delivery-start`),
  deliveryComplete: (id: number) => request.post(`/orders/${id}/delivery-complete`),
  cancel: (id: number) => request.post(`/orders/${id}/cancel`),
  manualCreate: (data: any) => request.post('/orders/manual', data),
  batchDispatch: (orderIds: number[], makerId: number, deliveryId: number) =>
    request.post('/orders/batch-dispatch', { orderIds, makerId, deliveryId }),
}
