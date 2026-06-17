import request from '@/utils/request'

export const orderApi = {
  list: (params?: any) => request.get('/orders', { params }),
  detail: (id: number) => request.get(`/orders/${id}`),
  dispatchToDelivery: (id: number, deliveryId: number) =>
    request.post(`/orders/${id}/dispatch-delivery`, { deliveryId }),
  deliveryStart: (id: number) => request.post(`/orders/${id}/delivery-start`),
  deliveryComplete: (id: number) => request.post(`/orders/${id}/delivery-complete`),
  cancel: (id: number) => request.post(`/orders/${id}/cancel`),
  updateSettlementMerchantName: (id: number, settlementMerchantName: string) =>
    request.put(`/orders/${id}/settlement-merchant-name`, { settlementMerchantName }),
  batchDispatch: (orderIds: number[], deliveryId: number) =>
    request.post('/orders/batch-dispatch', { orderIds, deliveryId }),
}
