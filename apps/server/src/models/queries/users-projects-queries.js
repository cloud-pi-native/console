import { sequelize } from '../../connect.js'
import { getUsersProjectsModel } from '../users-projects.js'

// TECH
export const _dropUsersProjectsTable = async () => {
  await sequelize.drop({
    tableName: getUsersProjectsModel().tableName,
    force: true,
    cascade: true,
  })
}
