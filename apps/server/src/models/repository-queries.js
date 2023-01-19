import { sequelize } from '../connect.js'
import { getRepositoryModel } from './project.js'

// DROP
export const dropRepositoriesTable = async () => {
  await sequelize.drop({
    tableName: getRepositoryModel().tableName,
    force: true,
    cascade: true,
  })
}
