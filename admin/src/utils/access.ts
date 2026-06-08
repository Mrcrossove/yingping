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
  Merchants: ['boss', 'admin'],
  Commissions: ['boss', 'admin'],
  Earnings: ['boss', 'admin'],
  MyEarnings: ['salesperson', 'maker', 'delivery', 'promoter'],
  Withdrawals: ['boss', 'admin'],
  Promotion: ['boss', 'admin', 'promoter'],
  Permissions: ['boss'],
  AuditLogs: ['boss', 'admin'],
  Payments: ['boss', 'admin'],
  Settings: ['boss', 'admin'],
}

export const ROUTE_PERMISSIONS: Record<string, string> = {
  Dashboard: 'finance:view',
  Orders: 'order:manage',
  OrderDetail: 'order:manage',
  Products: 'product:manage',
  Banners: 'product:manage',
  Users: 'user:manage',
  Merchants: 'user:manage',
  Commissions: 'commission:manage',
  Earnings: 'finance:view',
  Withdrawals: 'withdrawal:manage',
  Promotion: 'promotion:manage',
  Permissions: 'permission:manage',
  AuditLogs: 'audit:view',
  Payments: 'finance:view',
  Settings: 'setting:manage',
}

export function getUserRole() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    return user?.role || ''
  } catch {
    return ''
  }
}

export function getUserPermissions() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    return user?.permissions || []
  } catch {
    return []
  }
}

export function getHomePath(role: string) {
  if (role === 'admin') {
    const permissions = getUserPermissions()
    const entry = Object.entries(ROUTE_PERMISSIONS).find(([, permission]) => permissions.includes(permission))
    return entry ? `/${entry[0] === 'OrderDetail' ? 'orders' : routeNameToPath(entry[0])}` : '/403'
  }
  return ROLE_HOME[role] || '/orders'
}

function routeNameToPath(name: string) {
  const map: Record<string, string> = {
    Dashboard: 'dashboard',
    Orders: 'orders',
    Products: 'products',
    Banners: 'banners',
    Users: 'users',
    Merchants: 'merchants',
    Commissions: 'commissions',
    Earnings: 'earnings',
    MyEarnings: 'my-earnings',
    Withdrawals: 'withdrawals',
    Promotion: 'promotion',
    Permissions: 'permissions',
    AuditLogs: 'audit-logs',
    Payments: 'payments',
    Settings: 'settings',
  }
  return map[name] || 'orders'
}

export function canAccessRoute(routeName: unknown, role: string) {
  if (!routeName) return true
  const roles = ROUTE_ROLES[String(routeName)]
  if (roles && !roles.includes(role)) return false
  if (role === 'boss') return true
  if (role === 'admin') {
    const permission = ROUTE_PERMISSIONS[String(routeName)]
    const permissions = getUserPermissions()
    return !permission || permissions.includes(permission)
  }
  return true
}
