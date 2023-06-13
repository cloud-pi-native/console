import { sequelize } from '../../connect.js'
import { getClusterModel } from '../cluster.js'
import { Cluster, ClusterCreate, ClusterUpdate } from 'shared'

// SELECT
export const getClusters = async () => {
  return getClusterModel().findAll()
}

export const getClusterById = async (id: Cluster['id']) => {
  return getClusterModel().findByPk(id)
}

export const getClusterByName = async (name: Cluster['name']) => {
  const res = await getClusterModel().findAll({
    where: { name },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

export const getClusterBySecretName = async (secretName: Cluster['secretName']) => {
  const res = await getClusterModel().findAll({
    where: { secretName },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

// CREATE
export const createCluster = async (cluster: ClusterCreate) => {
  return getClusterModel().create(cluster)
}

// UPDATE
export const updateCluster = async (cluster: ClusterUpdate) => {
  return getClusterModel().update(cluster, { where: { id: cluster.id } })
}

// TEC
export const _createClusters = async (cluster: Cluster) => {
  return getClusterModel().create(cluster)
}

export const _dropClustersTable = async () => {
  await sequelize.drop({
    tableName: getClusterModel().tableName,
    force: true,
    cascade: true,
  })
}
