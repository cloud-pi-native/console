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

// DELETE
export const deleteRoleByUserIdAndProjectId = async (UserId, ProjectId) => {
  return await getUsersProjectsModel().destroy({
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
