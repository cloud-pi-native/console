import type { RouteHandler } from 'fastify'

import { addReqLogs } from '@/utils/logger.js'
import {
  sendOk,
  sendCreated,
  sendNoContent,
} from '@/utils/response.js'
import type {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectParams,
} from '@dso-console/shared'
import type { FastifyRequestWithSession } from '@/types/index.js'
import {
  getUserProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  getProjectSecrets,
} from './business.js'

// GET
export const getUserProjectsController: RouteHandler = async (req: FastifyRequestWithSession<void>, res) => {
  const requestor = req.session?.user
  delete requestor.groups

  const projectsInfos = await getUserProjects(requestor)
  addReqLogs({
    req,
    description: 'Projets de l\'utilisateur récupérés avec succès',
    extras: {
      userId: requestor.id,
    },
  })
  sendOk(res, projectsInfos)
}

export const getProjectByIdController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ProjectParams,
}>, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  const project = await getProject(projectId, userId)

  addReqLogs({
    req,
    description: 'Projet de l\'utilisateur récupéré avec succès',
    extras: {
      projectId,
      userId,
    },
  })
  sendOk(res, project)
}

export const getProjectSecretsController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ProjectParams,
}>, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  const projectSecrets = await getProjectSecrets(projectId, userId)

  addReqLogs({
    req,
    description: 'Secrets du projet récupérés avec succès',
    extras: {
      projectId,
      userId,
    },
  })
  sendOk(res, projectSecrets)
}

// POST

export const createProjectController: RouteHandler = async (req: FastifyRequestWithSession<{ Body: CreateProjectDto }>, res) => {
  const requestor = req.session?.user
  delete requestor.groups
  const data = req.body

  const project = await createProject(data, requestor)
  addReqLogs({
    req,
    description: 'Projet créé avec succès',
    extras: {
      projectId: project.id,
    },
  })
  sendCreated(res, project)
}

// UPDATE
export const updateProjectController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ProjectParams,
  Body: UpdateProjectDto
}>, res) => {
  const requestor = req.session?.user
  const projectId = req.params?.projectId
  const data = req.body

  const project = await updateProject(data, projectId, requestor)
  addReqLogs({
    req,
    description: 'Projet mis à jour avec succès',
    extras: {
      projectId,
    },
  })
  sendOk(res, project)
}

// DELETE
export const archiveProjectController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: ProjectParams
}>, res) => {
  const requestor = req.session?.user
  const projectId = req.params?.projectId

  await archiveProject(projectId, requestor)

  addReqLogs({
    req,
    description: 'Projet en cours de suppression',
    extras: {
      projectId,
    },
  })
  sendNoContent(res)
}
