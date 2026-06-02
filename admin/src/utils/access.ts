export const ROLE_HOME: Record<string, string> = {
  boss: '/dashboard',
  admin: '/dashboard',
  salesperson: '/orders',
  maker: '/orders',
  delivery: '/orders',
  promoter: '/promotion',
  merchant: '/orders',
}

export const ROUTE_ROLES: Record<string, string[]> = {
  Dashboard: ['boss', 'admin'],
  Orders: ['boss', 'admin', 'salesperson', 'maker', 'delivery', 'merchant'],
  OrderDetail: ['boss', 'admin', 'salesperson', 'maker', 'delivery', 'merchant'],
  Products: ['boss', 'admin'],
  Banners: ['boss', 'admin'],
  Users: ['boss', 'admin'],
  Commissions: ['boss', 'admin'],
  Withdrawals: ['boss', 'admin'],
  Promotion: ['boss', 'admin', 'promoter'],
  Permissions: ['boss'],
  AuditLogs: ['boss', 'admin'],
  Payments: ['boss', 'admin'],
  MerchantApprovals: ['boss', 'admin'],
}

export function getUserRole() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    return user?.role || ''
  } catch {
    return ''
  }
}

export function getHomePath(role: string) {
  return ROLE_HOME[role] || '/orders'
}

export function canAccessRoute(routeName: unknown, role: string) {
  if (!routeName) return true
  const roles = ROUTE_ROLES[String(routeName)]
  return !roles || roles.includes(role)
}
