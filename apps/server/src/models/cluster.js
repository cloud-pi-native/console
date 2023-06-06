import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let Cluster
export const getClusterModel = () => Cluster ?? (Cluster = sequelize.define('Cluster', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  clusterConfig: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  userConfig: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  disabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'Clusters',
}))
