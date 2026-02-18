import type {
  AdminRole,
  Prisma,
} from '@prisma/client'
import prisma from '@/prisma.js'
import { ADMIN_PERMS } from '@cpn-console/shared'

export const listAdminRoles = () => prisma.adminRole.findMany({ orderBy: { position: 'asc' } })

export function createAdminRole(data: Pick<Prisma.AdminRoleUncheckedCreateInput, 'name' | 'position'>) {
  return prisma.adminRole.create({
    data: {
      name: data.name,
      permissions: ADMIN_PERMS.LIST,
      position: data.position,
      type: 'custom',
    },
  })
}

export function updateAdminRole(id: AdminRole['id'], data: Pick<Prisma.AdminRoleUncheckedUpdateInput, 'permissions' | 'name' | 'position' | 'id'>) {
  return prisma.adminRole.updateMany({
    where: { id },
    data,
  })
}

export function deleteAdminRole(id: AdminRole['id']) {
  return prisma.adminRole.delete({
    where: {
      id,
    },
  })
}

export async function getAdminRoleById(id: string) {
  const role = await prisma.adminRole.findUnique({ where: { id } })
  if (!role) return null
  const members = await prisma.user.findMany({ where: { adminRoleIds: { has: id } } })
  return { ...role, members }
}
