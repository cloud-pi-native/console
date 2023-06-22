import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'
import { getClusterModel } from './cluster.js'
import { getEnvironmentModel } from './environment.js'

let EnvironmentsClusters
export const getEnvironmentsClustersModel = () => EnvironmentsClusters ?? (EnvironmentsClusters = sequelize.define('EnvironmentsClusters', {
  ClusterId: {
    type: DataTypes.UUID,
    references: {
      model: getEnvironmentModel(),
      key: 'id',
    },
  },
  ProjectId: {
    type: DataTypes.UUID,
    references: {
      model: getClusterModel(),
      key: 'id',
    },
  },
}))
