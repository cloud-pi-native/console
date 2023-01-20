import { sequelize } from '../connect.js'
import { getPermissionModel, getEnvironmentModel, getUserModel } from './models.js'
import { getProjectByEnvironmentId } from './environment-queries.js'

// CREATE
export const setPermission = async ({ userId, envId, level }) => {
  // TODO : passer ça dans le controller
  const project = await getProjectByEnvironmentId(envId)
  const isUserInProject = project?.usersId.includes(userId)
  if (!isUserInProject) throw Error('L\'utilisateur ne fait pas partie du projet')
  return getPermissionModel().upsert({ userId, environmentId: envId, level },
    {
      includes: [
        { model: getUserModel() },
        { model: getEnvironmentModel() },
      ],
    })
}

// DELETE

// TODO : requête delete permissions associées à l'env supprimé (voir cascade)

// DROP
export const dropPermissionsTable = async () => {
  await sequelize.drop({
    tableName: getPermissionModel().tableName,
    force: true,
    cascade: true,
  })
}
