import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

let Organization
export const getOrganizationModel = () => Organization ?? (Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    unique: true,
    defaultValue: DataTypes.UUIDV4,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  label: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'Organizations',
}))
