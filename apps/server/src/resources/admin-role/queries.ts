import {
  Prisma,
  AdminRole,
} from '@prisma/client'
import prisma from '@/prisma.js'

export const listAdminRoles = () => prisma.adminRole.findMany({ orderBy: { position: 'asc' } })

export const createAdminRole = (data: Pick<Prisma.AdminRoleUncheckedCreateInput, 'name' | 'position'>) =>
  prisma.adminRole.create({
    data: {
      name: data.name,
      permissions: 0n,
      position: data.position,
    },
  })

export const updateAdminRole = (id: AdminRole['id'], data: Pick<Prisma.AdminRoleUncheckedUpdateInput, 'permissions' | 'name' | 'position' | 'id'>) =>
  prisma.projectRole.updateMany({
    where: { id },
    data,
  })

export const deleteAdminRole = (id: AdminRole['id']) =>
  prisma.projectRole.delete({
    where: {
      id,
    },
  })
