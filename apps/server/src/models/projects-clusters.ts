import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'
import { getProjectModel } from './project.js'
import { getClusterModel } from './cluster.js'

let ProjectsClusters
export const getProjectsClustersModel = () => ProjectsClusters ?? (ProjectsClusters = sequelize.define('ProjectsClusters', {
  ClusterId: {
    type: DataTypes.UUID,
    references: {
      model: getClusterModel(),
      key: 'id',
    },
  },
  ProjectId: {
    type: DataTypes.UUID,
    references: {
      model: getProjectModel(),
      key: 'id',
    },
  },
}))
