export const ROLE_HOME: Record<string, string> = {
  boss: '/dashboard',
  admin: '/dashboard',
  delivery: '/orders',
  promoter: '/promotion',
  merchant: '/403',
}

export const ACTIVE_ROLES = ['boss', 'admin', 'delivery', 'promoter', 'merchant'] as const
export const ASSIGNABLE_PERMISSION_ROLES = ['admin', 'delivery', 'promoter'] as const
const ROLE_BASE_ROUTES: Record<string, string[]> = {
  delivery: ['Orders', 'OrderDetail', 'MyEarnings'],
  promoter: ['Promotion', 'MyEarnings'],
}

export const ROUTE_ROLES: Record<string, string[]> = {
  Dashboard: ['boss', 'admin', 'delivery', 'promoter'],
  Orders: ['boss', 'admin', 'delivery', 'promoter'],
  OrderDetail: ['boss', 'admin', 'delivery', 'promoter'],
  Products: ['boss', 'admin', 'delivery', 'promoter'],
  Banners: ['boss', 'admin', 'delivery', 'promoter'],
  Users: ['boss', 'admin', 'delivery', 'promoter'],
  Merchants: ['boss', 'admin', 'delivery', 'promoter'],
  Feedback: ['boss', 'admin', 'delivery', 'promoter'],
  Commissions: ['boss', 'admin', 'delivery', 'promoter'],
  Earnings: ['boss', 'admin', 'delivery', 'promoter'],
  MyEarnings: ['delivery', 'promoter'],
  Withdrawals: ['boss', 'admin', 'delivery', 'promoter'],
  Promotion: ['boss', 'admin', 'delivery', 'promoter'],
  Permissions: ['boss'],
  AuditLogs: ['boss', 'admin', 'delivery', 'promoter'],
  Payments: ['boss', 'admin', 'delivery', 'promoter'],
  Settings: ['boss', 'admin', 'delivery', 'promoter'],
}

export const ROUTE_PERMISSIONS: Record<string, string> = {
  Dashboard: 'finance:view',
  Orders: 'order:manage',
  OrderDetail: 'order:manage',
  Products: 'product:manage',
  Banners: 'product:manage',
  Users: 'user:manage',
  Merchants: 'user:manage',
  Feedback: 'feedback:manage',
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

export function isAssignablePermissionRole(role: string) {
  return ASSIGNABLE_PERMISSION_ROLES.includes(role as (typeof ASSIGNABLE_PERMISSION_ROLES)[number])
}

export function getHomePath(role: string) {
  if (isAssignablePermissionRole(role)) {
    const permissions = getUserPermissions()
    const entry = Object.entries(ROUTE_PERMISSIONS).find(([, permission]) => permissions.includes(permission))
    if (entry) return `/${entry[0] === 'OrderDetail' ? 'orders' : routeNameToPath(entry[0])}`
  }
  return ROLE_HOME[role] || '/403'
}

function routeNameToPath(name: string) {
  const map: Record<string, string> = {
    Dashboard: 'dashboard',
    Orders: 'orders',
    Products: 'products',
    Banners: 'banners',
    Users: 'users',
    Merchants: 'merchants',
    Feedback: 'feedback',
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
  const name = String(routeName)
  const roles = ROUTE_ROLES[name]
  if (roles && !roles.includes(role)) return false
  if (role === 'boss') return true
  if (ROLE_BASE_ROUTES[role]?.includes(name)) return true
  if (isAssignablePermissionRole(role)) {
    const permission = ROUTE_PERMISSIONS[name]
    const permissions = getUserPermissions()
    return !permission || permissions.includes(permission)
  }
  return true
}

export function isSupportedRole(role: string) {
  return ACTIVE_ROLES.includes(role as (typeof ACTIVE_ROLES)[number])
}

export function hasPermission(permission: string) {
  const role = getUserRole()
  if (role === 'boss') return true
  if (!isAssignablePermissionRole(role)) return false
  return getUserPermissions().includes(permission)
}
