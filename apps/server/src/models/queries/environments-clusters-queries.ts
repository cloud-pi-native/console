import { sequelize } from '../../connect.js'
import { getClusterModel } from '../cluster.js'
import { getProjectModel } from '../project.js'
import { getEnvironmentsClustersModel } from '../environments-clusters.js'
import { Project, Cluster, Environment } from 'shared'

type ClusterId = Cluster['id']
type EnvironmentId = Environment['id']

// SELECT
export const getClusterByEnvironmentId = async (EnvironmentId: EnvironmentId) => {
  return getEnvironmentsClustersModel().findAll({
    where: {
      EnvironmentId,
    },
    includes: { model: getClusterModel() },
  })
}

// CREATE
export const addClusterToEnvironmentsWithIds = async (environmentId: EnvironmentId, clusterId: ClusterId) => {
  return getProjectModel().findByPk(environmentId).addCluster(clusterId)
}

// DELETE
export const removeClusterFromProjectsWithIds = async (EnvironmentId: EnvironmentId, ClusterId: ClusterId) => {
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
