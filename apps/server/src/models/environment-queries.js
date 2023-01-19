import { sequelize } from '../connect.js'
import { getEnvironmentModel } from './project.js'

// SELECT

// DROP
export const dropEnvironmentsTable = async () => {
  await sequelize.drop({
    tableName: getEnvironmentModel().tableName,
    force: true,
    cascade: true,
  })
}
