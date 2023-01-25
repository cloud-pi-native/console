import { Op } from 'sequelize'
import { sequelize } from '../../connect.js'
import { getUserModel } from '../user.js'
import { allDataAttributes, getUniq } from '../../utils/queries-tools.js'
import { adminsUserId } from '../../utils/env.js'

// SELECT
export const getUsers = async () => {
  return await getUserModel().findAll()
}

export const getUserInfos = async (id) => {
  const usr = await getUserModel().findAll({
    ...allDataAttributes,
    where: { id },
    include: {
      all: true,
      nested: true,
      ...allDataAttributes,
    },
  })
  return usr
}

export const getUserById = async (id) => {
  return await getUserModel().findByPk(id)
}

export const getUserByEmail = async (email) => {
  const res = await getUserModel().findAll({
    where: {
      email: { [Op.eq]: email },
    },
  })
  return getUniq(res)
}

// CREATE
export const createUser = async ({ id, email, firstName, lastName }) => {
  const user = await getUserByEmail(email)
  const role = adminsUserId.includes(id) ? 'admin' : ''
  if (user) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return await getUserModel().create({ id, email, firstName, lastName, role })
}

// UPDATE
export const updateUserById = async ({ id, name, email, firstName, lastName }) => {
  const user = await getUserById(id)
  const isEmailAlreadyTaken = await getUserByEmail(email)
  if (!user) throw new Error('L\'utilisateur demandé n\'existe pas')
  if (isEmailAlreadyTaken) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  if (user && !isEmailAlreadyTaken) {
    const res = await getUserModel().update({
      name,
      email,
      firstName,
      lastName,
    }, {
      where: id,
    })
    return res
  }
}

// TECH
export const _dropUsersTable = async () => {
  await sequelize.drop({
    tableName: getUserModel().tableName,
    force: true,
    cascade: true,
  })
}
