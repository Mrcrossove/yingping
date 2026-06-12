import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { API_BASE_URL } from '@/config'

const request = axios.create({
  baseURL: API_BASE_URL + '/api',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') {
      return response.data
    }
    const { data } = response
    if (data.code !== 200) {
      ElMessage.error(data.message || '请求失败')
      if (data.code === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
      }
      return Promise.reject(new Error(data.message))
    }
    return data.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
    ElMessage.error(error.response?.data?.message || '网络错误')
    return Promise.reject(error)
  }
)

const http = {
  get: <T = any>(url: string, config?: any): Promise<T> => request.get(url, config),
  post: <T = any>(url: string, data?: any, config?: any): Promise<T> => request.post(url, data, config),
  put: <T = any>(url: string, data?: any, config?: any): Promise<T> => request.put(url, data, config),
  delete: <T = any>(url: string, config?: any): Promise<T> => request.delete(url, config),
}

export default http
