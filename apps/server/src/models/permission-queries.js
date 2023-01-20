import { sequelize } from '../connect.js'
import { getPermissionModel, getEnvironmentModel, getUserModel } from './models.js'

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

// DROP
export const dropPermissionsTable = async () => {
  await sequelize.drop({
    tableName: getPermissionModel().tableName,
    force: true,
    cascade: true,
  })
}
