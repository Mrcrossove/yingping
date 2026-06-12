import { paymentApi } from '@/api/index'

export function isPaymentCanceled(error: any) {
  const message = `${error?.errMsg || ''}${error?.message || ''}`
  return message.includes('cancel')
}

export async function requestOrderPayment(orderId: number, openid?: string) {
  await paymentApi.create(orderId).catch((error: any) => {
    const message = error?.message || ''
    if (!message.includes('已有支付记录')) throw error
  })

  const payParams = await paymentApi.jsapi(orderId, openid)
  await new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType || 'RSA',
      paySign: payParams.paySign,
      success: () => resolve(),
      fail: reject,
    })
  })
}
