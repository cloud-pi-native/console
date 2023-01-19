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
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'Users',
}))

let Project
export const getProjectModel = () => Project ?? (Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  organization: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  usersId: {
    type: DataTypes.ARRAY(DataTypes.UUID),
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
  uniqueKeys: {
    unique_fields: {
      fields: ['organization', 'name'],
    },
  },
}))

let Environment
export const getEnvironmentModel = () => Environment ?? (Environment = sequelize.define('Environment', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  projectId: {
    type: DataTypes.UUID,
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  environmentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'Permissions',
  primaryKey: ['userId', 'environmentId'],
}))

let Repository
export const getRepositoryModel = () => Repository ?? (Repository = sequelize.define('Repository', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  internalName: {
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
