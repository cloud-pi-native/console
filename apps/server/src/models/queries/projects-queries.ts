import { sequelize } from '../../connect.js'
import { getClusterModel } from '../cluster.js'
import { getProjectModel } from '../project.js'
import { getUsersProjectsModel } from '../users-projects.js'
import { ProjectModel, ClusterModel } from 'shared'

// SELECT
export const getClustersByProjectId = async (ProjectId: ProjectModel['id']) => {
  return getProjectModel().findByPk(ProjectId).getClusters()
}
export const getProjectsByClusterId = async (ClusterId: ClusterModel['id']) => {
  return getClusterModel().findByPk(ClusterId).getProjects()
}

// CREATE
export const addClusterToProjectWithIds = async (ProjectId: ProjectModel['id'], ClusterId: ClusterModel['id']) => {
  return getProjectModel().findByPk(ProjectId).addCluster(ClusterId)
}

// DELETE
export const removeClusterFromProjectsWithIds = async (ClusterId: ClusterModel['id'], ProjectId: ProjectModel['id']) => {
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
