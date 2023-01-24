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
  // TODO attention cette colonne va disparaitre
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  organization: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  // TODO attention cette colonne va disparaitre
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
