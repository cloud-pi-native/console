import { sequelize } from '../../connect.js'
import { getClusterModel } from '../cluster.js'
import { getProjectModel } from '../project.js'
import { getUsersProjectsModel } from '../users-projects.js'
import { Project, Cluster } from 'shared'

type ClusterId = Cluster['id']
type ProjectId = Project['id']
// SELECT
export const getClustersByProjectId = async (ProjectId: ProjectId) => {
  return getUsersProjectsModel().findAll({
    where: {
      ProjectId,
    },
    includes: { model: getClusterModel() },
  })
}
export const getProjectsByClusterId = async (ClusterId: ClusterId) => {
  return getUsersProjectsModel().findAll({
    where: {
      ClusterId,
    },
    includes: { model: getProjectModel() },
  })
}

// CREATE
export const addClusterToProjectWithIds = async (ProjectId: ProjectId, ClusterId: ClusterId) => {
  return getProjectModel().findByPk(ProjectId).addCluster(ClusterId)
}

// DELETE
export const removeClusterFromProjectsWithIds = async (ClusterId: ClusterId, ProjectId: ProjectId) => {
  return getUsersProjectsModel().destroy({
    where: {
      ClusterId,
      ProjectId,
    },
  })
}

// TECH
export const _dropProjectsClustersTable = async () => {
  await sequelize.drop({
    tableName: getUsersProjectsModel().tableName,
    force: true,
    cascade: true,
  })
}
