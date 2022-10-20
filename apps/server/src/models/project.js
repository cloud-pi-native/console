import { DataTypes } from 'sequelize'
import { sequelize } from '../connect.js'

const Project = () => sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    unique: true,
    primaryKey: true,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
}, {
  tableName: 'Projects',
})

export default Project
