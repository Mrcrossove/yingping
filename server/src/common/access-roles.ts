import { Role } from '@prisma/client';

export const ASSIGNABLE_PERMISSION_ROLES: Role[] = ['admin', 'delivery', 'promoter'];
export const BACKOFFICE_PERMISSION_ROLES: Role[] = ['boss', ...ASSIGNABLE_PERMISSION_ROLES];

export function isAssignablePermissionRole(role?: string): role is Role {
  return ASSIGNABLE_PERMISSION_ROLES.includes(role as Role);
}
