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
  label: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'Organizations',
}))
