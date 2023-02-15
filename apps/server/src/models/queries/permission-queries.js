import { sequelize } from '../../connect.js'
import { getPermissionModel } from '../permission.js'

// GET
export const getEnvironmentPermissions = async (environmentId) => {
  return getPermissionModel().findAll({
    environmentId,
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
export const setPermission = async ({ userId, environmentId, level }) => {
  return getPermissionModel().create({ userId, environmentId, level })
}

// UPDATE
export const updatePermission = async ({ userId, environmentId, level }) => {
  return getPermissionModel().update({
    userId,
    environmentId,
    level,
  },
  {
    where: {
      userId,
      environmentId,
    },
  })
}

// DELETE
export const deletePermission = async (userId, environmentId) => {
  return getPermissionModel().destroy({
    where: {
      userId,
      environmentId,
    },
  })
}

export const deletePermissionById = async (permissionId) => {
  return getPermissionModel().destroy({
    where: {
      id: permissionId,
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
