import { Op } from 'sequelize'
import { sequelize } from '../connect.js'
import { getUserModel } from './project.js'

// SELECT
export const getUsers = async () => {
  const res = await getUserModel().findAll()
  return res
}

export const getUserById = async (id) => {
  const res = await getUserModel().findByPK(id)
  return res
}

export const getUserByEmail = async (email) => {
  const res = await getUserModel().findAll({
    where: {
      email: { [Op.eq]: email },
    },
  })
  return res
}

// CREATE
export const createUser = async ({ id, email, organization, firstName, lastName }) => {
  const users = await getUserByEmail(email)
  console.log(users)
  if (!users.length) {
    const res = await getUserModel().create({ id, email, organization, firstName, lastName })
    return res
  }
  return users
}

// UPDATE
export const updateUserById = async ({ id, name, email, organization, firstName, _lastName }) => {
  const users = await getUserById(id)
  console.log(users)
  if (users.length) {
    const res = await getUserModel().update({
      name,
      email,
      organization,
      firstName,
      _lastName,
    }, {
      where: id,
    })
    return res
  }
  throw Error('Email déjà existant en BDD')
}

// DROP
export const dropUsersTable = async () => {
  await sequelize.drop({
    tableName: getUserModel().tableName,
    force: true,
    cascade: true,
  })
}
