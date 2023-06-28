import { prisma } from '../../connect.js'

// SELECT
export const getRepositoryById = async (id) => {
  return prisma.repository.findUnique({ where: { id } })
}

export const getProjectRepositories = async (projectId) => {
  return prisma.repository.findMany({ where: { projectId } })
}

export const getInfraProjectRepositories = async (projectId) => {
  return prisma.repository.findMany({ where: { projectId, isInfra: true } })
}

// CREATE
export const initializeRepository = async ({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName, externalToken }) => {
  return prisma.repository.create({
    projectId,
    internalRepoName,
    externalRepoUrl,
    externalUserName,
    externalToken: '',
    isInfra,
    isPrivate,
    status: 'initializing',
  })
}

// UPDATE
export const updateRepositoryCreated = async (id) => {
  return prisma.repository.update({ where: { id }, data: { status: 'created' } })
}

export const updateRepositoryFailed = async (id) => {
  return prisma.repository.update({ where: { id }, data: { status: 'failed' } })
}

export const updateRepository = async (id, infos) => {
  return prisma.repository.update({ where: { id }, data: { ...infos, status: 'initializing' } })
}

// DELETE
export const updateRepositoryDeleting = async (id) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repository.update({ where: { id }, data: { status: 'deleting' } })
}

export const deleteRepository = async (id) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repository.delete({ where: { id } })
}

// TECH
export const _dropRepositoriesTable = async () => {
  await prisma.repository.deleteMany({})
}
