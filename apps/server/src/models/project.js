import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

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
  organization: {
    type: DataTypes.UUID,
    allowNull: false,
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
  services: {
    type: DataTypes.JSONB,
  },
}, {
  tableName: 'Projects',
  uniqueKeys: {
    unique_fields: {
      fields: ['organization', 'name'],
    },
  },
}))
