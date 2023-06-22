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
  label: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  user: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  cluster: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  privacy: {
    type: DataTypes.ENUM('public', 'dedicated'),
    allowNull: false,
    defaultValue: 'dedicated',
  },
  secretName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    defaultValue: DataTypes.UUIDV4,
  },
  clusterResources: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'Clusters',
}))
