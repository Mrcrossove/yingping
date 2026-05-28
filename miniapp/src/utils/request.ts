import { API_BASE_URL } from '@/config'

function request(options: UniApp.RequestOptions): Promise<any> {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      url: API_BASE_URL + '/api' + options.url,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success: (res: any) => {
        const { data } = res
        if (data.code === 200) {
          resolve(data.data)
        } else {
          uni.showToast({ title: data.message || '请求失败', icon: 'none' })
          reject(data)
        }
        if (data.code === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('user')
          uni.reLaunch({ url: '/pages/index/index' })
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}

export const get = (url: string, data?: any) => request({ method: 'GET', url, data })
export const post = (url: string, data?: any) => request({ method: 'POST', url, data })
export const put = (url: string, data?: any) => request({ method: 'PUT', url, data })
export const del = (url: string, data?: any) => request({ method: 'DELETE', url, data })
