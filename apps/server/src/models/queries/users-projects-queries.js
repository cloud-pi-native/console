import { sequelize } from '../../connect.js'
import { getUsersProjectsModel } from '../users-projects.js'

// SELECT
export const getRoleByUserIdAndProjectId = async (UserId, ProjectId) => {
  const res = await getUsersProjectsModel().findAll({
    attributes: [
      'role',
    ],
    where: {
      UserId,
      ProjectId,
    },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

export const getSingleOwnerByProjectId = async (ProjectId) => {
  const res = await getUsersProjectsModel().findAll({
    attributes: [
      'UserId',
    ],
    where: {
      role: 'owner',
      ProjectId,
    },
    limit: 1,
  })
  return Array.isArray(res) ? res[0].UserId : res.UserId
}

// UPDATE
export const updateUserProjectRole = async (UserId, ProjectId, role) => {
  return getUsersProjectsModel().update(
    { role },
    {
      where: {
        UserId,
        ProjectId,
      },
    },
  )
}

// DELETE
export const deleteRoleByUserIdAndProjectId = async (UserId, ProjectId) => {
  return getUsersProjectsModel().destroy({
    where: {
      UserId,
      ProjectId,
    },
  })
}

// TECH
export const _dropUsersProjectsTable = async () => {
  await sequelize.drop({
    tableName: getUsersProjectsModel().tableName,
    force: true,
    cascade: true,
  })
}
