import { sequelize } from '../../connect.js'
import { getPermissionModel } from '../permission.js'
import { getEnvironmentModel } from '../environment.js'
import { getUserModel } from '../user.js'

// GET
export const getEnvPermissions = async (envId) => {
  return getPermissionModel().findAll({
    environmentId: envId,
  })
}

export const getUserPermissions = async (userId) => {
  return getPermissionModel().findAll({
    userId,
  })
}

export const getPermissionByUserIdAndEnvironmentId = async (userId, environmentId) => {
  return getPermissionModel().findAll({
    attributes: ['level'],
    where: {
      userId,
      environmentId,
    },
  })
}

// CREATE
export const setPermission = async ({ userId, envId, level }) => {
  return getPermissionModel().upsert({ userId, environmentId: envId, level },
    {
      includes: [
        { model: getUserModel() },
        { model: getEnvironmentModel() },
      ],
    })
}

// DELETE
export const deletePermission = async (userId, environmentId) => {
  return await getPermissionModel().destroy({
    where: {
      userId,
      environmentId,
    },
  })
}

// TECH
export const _dropPermissionsTable = async () => {
  await sequelize.drop({
    tableName: getPermissionModel().tableName,
    force: true,
    cascade: true,
  })
}
