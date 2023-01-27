import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let Repository
export const getRepositoryModel = () => Repository ?? (Repository = sequelize.define('Repository', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  internalRepoName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  externalRepoUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  externalUserName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  externalToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isInfra: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'initializing',
  },
}, {
  tableName: 'Repositories',
}))