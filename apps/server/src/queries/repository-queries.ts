import { Projects, Repositories } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getRepositoryById = async (id: Repositories['id']) => {
  return prisma.repositories.findUnique({ where: { id } })
}

export const getProjectRepositories = async (projectId: Projects['id']) => {
  return prisma.repositories.findMany({ where: { projectId } })
}

export const getInfraProjectRepositories = async (projectId: Projects['id']) => {
  return prisma.repositories.findMany({ where: { projectId, isInfra: true } })
}

type RepositoryCreate = Pick<Repositories, 'projectId' | 'internalRepoName' | 'isInfra' | 'isPrivate' | 'externalRepoUrl'> &
  Partial<Pick<Repositories, 'externalUserName' | 'externalToken'>>
// CREATE
export const initializeRepository = async ({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName = '' }: RepositoryCreate) => {
  return prisma.repositories.create({
    data: {
      projectId,
      internalRepoName,
      externalRepoUrl,
      externalUserName,
      externalToken: '',
      isInfra,
      isPrivate,
      status: 'initializing',
    },
  })
}

// UPDATE
export const updateRepositoryCreated = async (id: Repositories['id']) => {
  return prisma.repositories.update({ where: { id }, data: { status: 'created' } })
}

export const updateRepositoryFailed = async (id: Repositories['id']) => {
  return prisma.repositories.update({ where: { id }, data: { status: 'failed' } })
}

export const updateRepository = async (id: Repositories['id'], infos: Partial<Repositories>) => {
  return prisma.repositories.update({ where: { id }, data: { ...infos, status: 'initializing' } })
}

// DELETE
export const updateRepositoryDeleting = async (id: Repositories['id']) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repositories.update({ where: { id }, data: { status: 'deleting' } })
}

export const deleteRepository = async (id: Repositories['id']) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repositories.delete({ where: { id } })
}

// TECH
export const _dropRepositoriesTable = async () => {
  await prisma.repositories.deleteMany({})
}

export const _createRepository = async (data: Parameters<typeof prisma.repositories.upsert>[0]['create']) => {
  await prisma.repositories.upsert({ create: data, update: data, where: { id: data.id } })
}
