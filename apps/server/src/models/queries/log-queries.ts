import { sequelize } from '../../connect.js'
import { getLogModel } from '../log.js'

// SELECT
export const getAllLogsForUser = async (user, offset = 0) => {
  const res = await getLogModel().findAll({
    where: {
      user,
    },
    limit: 100,
    offset,
  })
  return res
}

export const getAllLogs = async (offset = 0) => {
  const res = await getLogModel().findAll({
    limit: 100,
    offset,
  })
  return res
}

// CREATE
export const addLogs = async (action, data, userId) => {
  const res = await getLogModel().create({
    action,
    userId,
    data,
  })
  return res
}

// TECH
export const _dropLogsTable = async () => {
  await sequelize.drop({
    tableName: getLogModel().tableName,
    force: true,
    cascade: true,
  })
}
