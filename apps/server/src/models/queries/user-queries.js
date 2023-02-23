import { Op } from 'sequelize'
import { sequelize } from '../../connect.js'
import { getUserModel } from '../user.js'
import { dbKeysExcluded } from '../../utils/queries-tools.js'
import { adminsUserId } from '../../utils/env.js'

// SELECT
export const getUsers = async () => {
  return getUserModel().findAll()
}

export const getUserInfos = async (id) => {
  const usr = await getUserModel().findAll({
    ...dbKeysExcluded,
    where: { id },
    include: {
      all: true,
      nested: true,
      ...dbKeysExcluded,
    },
  })
  return usr
}

export const getUserById = async (id) => {
  return getUserModel().findByPk(id)
}

export const getOrCreateUser = async (user) => {
  delete user.groups
  const foundUser = await getUserModel().findOrCreate({
    where: { id: user.id },
    defaults: {
      ...user,
      isAdmin: false,
    },
  })
  console.log(foundUser)
  return foundUser[0]
}

export const getUserByEmail = async (email) => {
  const res = await getUserModel().findAll({
    where: {
      email: { [Op.eq]: email },
    },
    limit: 1,
  })
  return Array.isArray(res) ? res[0] : res
}

// CREATE
export const createUser = async ({ id, email, firstName, lastName }) => {
  const user = await getUserByEmail(email)
  const isAdmin = !!adminsUserId.includes(id)
  if (user) throw new Error('Un utilisateur avec cette adresse e-mail existe déjà')
  return getUserModel().create({ id, email, firstName, lastName, isAdmin })
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
