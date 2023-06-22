import { sequelize } from '../../connect.js'
import { getClusterModel } from '../cluster.js'
import { ClusterModel } from 'shared'

// SELECT
export const getClusters = async () => {
  return getClusterModel().findAll()
}

export const getClusterById = async (id: ClusterModel['id']) => {
  return getClusterModel().findByPk(id)
}

export const getClusterByLabel = async (label: ClusterModel['label']) => {
  const res = await getClusterModel().findAll({
    where: { label },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

export const getClusterBySecretName = async (secretName: ClusterModel['secretName']) => {
  const res = await getClusterModel().findAll({
    where: { secretName },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

// CREATE
type ClusterCreate = Omit<ClusterModel, 'id' | 'secretName'>
export const createCluster = async (cluster: ClusterCreate) => {
  return getClusterModel().create(cluster)
}

// UPDATE
type ClusterUpdate = Partial<Omit<ClusterModel, 'label'>> & {
  id: ClusterModel['id']
}
export const updateCluster = async (cluster: ClusterUpdate) => {
  return getClusterModel().update(cluster, { where: { id: cluster.id } })
}

// TEC
export const _createClusters = async (cluster: ClusterModel) => {
  return getClusterModel().create(cluster)
}

export const _dropClustersTable = async () => {
  await sequelize.drop({
    tableName: getClusterModel().tableName,
    force: true,
    cascade: true,
  })
}
