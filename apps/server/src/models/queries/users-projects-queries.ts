import { prisma } from '../../connect.js'
import { Project, User, UsersProjects } from '@prisma/client'
import { projectRoles } from 'shared'

type ProjectRoles = typeof projectRoles[number]

// SELECT
export const getRoleByUserIdAndProjectId = async (UserId: User['id'], ProjectId: Project['id']) => {
  const res = await prisma.usersProjects.findFirst({ select: { role: true }, where: { UserId, ProjectId } })
  return res
}

export const getSingleOwnerByProjectId = async (ProjectId: Project['id']) => {
  return (await prisma.usersProjects.findFirst({
    select: { user: true },
    where: { role: 'owner', ProjectId },
  })).user
}

// UPDATE
export const updateUserProjectRole = async (UserId: User['id'], ProjectId: Project['id'], role: ProjectRoles) => {
  return prisma.usersProjects.updateMany({ where: { UserId, ProjectId }, data: { role } })
}

// DELETE
export const deleteRoleByUserIdAndProjectId = async (UserId: User['id'], ProjectId: Project['id']) => {
  return prisma.usersProjects.deleteMany({ where: { UserId, ProjectId } })
}

// TECH
export const _dropUsersProjectsTable = async () => {
  await prisma.usersProjects.deleteMany({})
}
