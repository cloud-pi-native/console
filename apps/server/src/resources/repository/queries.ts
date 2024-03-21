import type { Project, Repository } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getRepositoryById = async (id: Repository['id']) => {
  return prisma.repository.findUnique({ where: { id } })
}

export const getProjectRepositories = async (projectId: Project['id']) => {
  return prisma.repository.findMany({ where: { projectId } })
}

type RepositoryCreate = Pick<Repository, 'projectId' | 'internalRepoName' | 'isInfra' | 'isPrivate' | 'externalRepoUrl'> &
  Partial<Pick<Repository, 'externalUserName'>>
// CREATE
export const initializeRepository = async ({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName = undefined }: RepositoryCreate) => {
  return prisma.repository.create({
    data: {
      projectId,
      internalRepoName,
      externalRepoUrl,
      externalUserName,
      isInfra,
      isPrivate,
    },
  })
}

// UPDATE
export const updateRepository = async (id: Repository['id'], infos: Partial<Repository>) => {
  return prisma.repository.update({ where: { id }, data: { ...infos } })
}

// DELETE
export const deleteRepository = async (id: Repository['id']) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repository.delete({ where: { id } })
}

export const deleteAllRepositoryForProject = async (id: Project['id']) => {
  return prisma.repository.deleteMany({ where: { projectId: id } })
}

// TECH
export const _dropRepositoriesTable = async () => {
  await prisma.repository.deleteMany({})
}

export const _createRepository = async (data: Parameters<typeof prisma.repository.upsert>[0]['create']) => {
  await prisma.repository.upsert({ create: data, update: data, where: { id: data.id } })
}
