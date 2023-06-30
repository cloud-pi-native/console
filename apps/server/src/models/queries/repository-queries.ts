import { Project, Repository } from '@prisma/client'
import prisma from '../../prisma'

// SELECT
export const getRepositoryById = async (id: Repository['id']) => {
  return prisma.repository.findUnique({ where: { id } })
}

export const getProjectRepositories = async (projectId: Project['id']) => {
  return prisma.repository.findMany({ where: { projectId } })
}

export const getInfraProjectRepositories = async (projectId: Project['id']) => {
  return prisma.repository.findMany({ where: { projectId, isInfra: true } })
}

type RepositoryCreate = Omit<Repository, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'externalToken'>
// CREATE
export const initializeRepository = async ({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName }: RepositoryCreate) => {
  return prisma.repository.create({
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
export const updateRepositoryCreated = async (id: Repository['id']) => {
  return prisma.repository.update({ where: { id }, data: { status: 'created' } })
}

export const updateRepositoryFailed = async (id: Repository['id']) => {
  return prisma.repository.update({ where: { id }, data: { status: 'failed' } })
}

export const updateRepository = async (id: Repository['id'], infos: Partial<Repository>) => {
  return prisma.repository.update({ where: { id }, data: { ...infos, status: 'initializing' } })
}

// DELETE
export const updateRepositoryDeleting = async (id: Repository['id']) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repository.update({ where: { id }, data: { status: 'deleting' } })
}

export const deleteRepository = async (id: Repository['id']) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repository.delete({ where: { id } })
}

// TECH
export const _dropRepositoriesTable = async () => {
  await prisma.repository.deleteMany({})
}
