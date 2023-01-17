import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let Organization
export const getOrganizationModel = () => Organization ?? (Organization = sequelize.define('Organization', {
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    primaryKey: true,
  },
}, {
  tableName: 'Organizations',
}))

let User
export const getUserModel = () => User ?? (User = sequelize.define('User', {
  uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  organization: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(50),
    allowNull: false,
    primaryKey: true,
  },
}, {
  tableName: 'Users',
}))

let Project
export const getProjectModel = () => Project ?? (Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    unique: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  ownerUuid: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  organization: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  users: {
    type: DataTypes.ARRAY(DataTypes.STRING(50)),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  locked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'Projects',
}))

let Environment
export const getEnvironmentModel = () => Environment ?? (Environment = sequelize.define('Environment', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    unique: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'initializing',
  },
}, {
  tableName: 'Environments',
}))

let Permission
export const getPermissionModel = () => Permission ?? (Permission = sequelize.define('Permission', {
  user_uuid: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  environment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'Permissions',
  primaryKey: ['user_id', 'environment_id'],
}))

let Repository
export const getRepositoryModel = () => Repository ?? (Repository = sequelize.define('Repository', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  internalName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  repoSrc: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  authUser: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  authToken: {
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
