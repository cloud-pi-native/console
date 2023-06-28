import { prisma } from '../../connect.js'

// SELECT
export const getRoleByUserIdAndProjectId = async (UserId, ProjectId) => {
  const res = await prisma.usersProjects.findUnique({ select: { role: true }, where: { UserId, ProjectId } })
  return res
}

export const getSingleOwnerByProjectId = async (ProjectId) => {
  const res = await prisma.usersProjects.findUnique({ select: { UserId: true }, where: { role: 'owner', ProjectId } })
  const resUser = await prisma.user.findUnique({ where: { id: res.UserId } })

  return resUser
}

// UPDATE
export const updateUserProjectRole = async (UserId, ProjectId, role) => {
  return prisma.usersProjects.update({ where: { UserId, ProjectId }, data: { role } })
}

// DELETE
export const deleteRoleByUserIdAndProjectId = async (UserId, ProjectId) => {
  return prisma.usersProjects.delete({ where: { UserId, ProjectId } })
}

// TECH
export const _dropUsersProjectsTable = async () => {
  await prisma.usersProjects.deleteMany({})
}
