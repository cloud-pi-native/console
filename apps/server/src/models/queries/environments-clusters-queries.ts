import { sequelize } from '../../connect.js'
import { getClusterModel } from '../cluster.js'
import { getProjectModel } from '../project.js'
import { getEnvironmentsClustersModel } from '../environments-clusters.js'
import { ClusterModel, EnvironmentModel } from 'shared'

// SELECT
export const getClusterByEnvironmentId = async (EnvironmentId: EnvironmentModel['id']) => {
  return getEnvironmentsClustersModel().findAll({
    where: {
      EnvironmentId,
    },
    includes: { model: getClusterModel() },
  })
}

// CREATE
export const addClusterToEnvironment = async (environmentId: EnvironmentModel['id'], clusterId: ClusterModel['id']) => {
  return getProjectModel().findByPk(environmentId).addCluster(clusterId)
}

// DELETE
export const removeClusterFromProject = async (EnvironmentId: EnvironmentModel['id'], ClusterId: ClusterModel['id']) => {
  return getEnvironmentsClustersModel().destroy({
    where: {
      EnvironmentId,
      ClusterId,
    },
  })
}

// TECH
export const _dropProjectsClustersTable = async () => {
  await sequelize.drop({
    tableName: getEnvironmentsClustersModel().tableName,
    force: true,
    cascade: true,
  })
}
