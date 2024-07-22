import {
  Prisma,
  ProjectRole,
  type Project,
} from '@prisma/client'

import prisma from '@/prisma.js'

export const listRoles = (projectId: Project['id']) => prisma.projectRole.findMany({ where: { projectId }, orderBy: { position: 'asc' } })

export const createRole = (data: Pick<Prisma.ProjectRoleUncheckedCreateInput, 'permissions' | 'name' | 'position' | 'projectId'>) =>
  prisma.projectRole.create({
    data: {
      name: data.name,
      permissions: 0n,
      position: data.position,
      projectId: data.projectId,
    },
  })

export const updateRole = (id: ProjectRole['id'], data: Pick<Prisma.ProjectRoleUncheckedUpdateInput, 'permissions' | 'name' | 'position' | 'id'>) =>
  prisma.projectRole.updateMany({
    where: { id },
    data,
  })

export const deleteRole = async (id: ProjectRole['id']) => {
  const role = await prisma.projectRole.delete({
    where: {
      id,
    },
  })
  const attachedMembers = await prisma.projectMembers.findMany({
    where: { projectId: role.projectId, roleIds: { has: id } },
  })
  for (const member of attachedMembers) {
    await prisma.projectMembers.update({
      where: {
        projectId_userId: {
          projectId: role.projectId,
          userId: member.userId,
        },
      },
      data: {
        roleIds: {
          set: member.roleIds.filter(roleId => roleId !== id),
        },
      },
    })
  }
}
