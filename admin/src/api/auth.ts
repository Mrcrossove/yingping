import request from '@/utils/request'

export const authApi = {
  login: (data: { username: string; password: string }) => request.post('/auth/login', data),
  getProfile: () => request.get('/auth/profile'),
}
