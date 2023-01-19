import { sequelize } from '../connect.js'
import { getPermissionModel } from './project.js'

// DROP
export const dropPermissionsTable = async () => {
  await sequelize.drop({
    tableName: getPermissionModel().tableName,
    force: true,
    cascade: true,
  })
}
