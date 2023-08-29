import { addReqLogs } from '@/utils/logger.js'
import {
  sendOk,
  sendCreated,
} from '@/utils/response.js'
import {
  type CreateProjectDto,
  UpdateProjectDto,
  ArchiveProjectDto,
} from '@dso-console/shared'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import {
  getUserProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
} from './business.js'

// GET
export const getUserProjectsController = async (req: EnhancedFastifyRequest<void>, res) => {
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

export const getProjectByIdController = async (req, res) => {
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

// POST
export const createProjectController = async (req: EnhancedFastifyRequest<CreateProjectDto>, res) => {
  const requestor = req.session?.user
  delete requestor.groups
  const data = req.body

  const project = await createProject({ ...data }, requestor)
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
export const updateProjectController = async (req: EnhancedFastifyRequest<UpdateProjectDto>, res) => {
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
export const archiveProjectController = async (req: EnhancedFastifyRequest<ArchiveProjectDto>, res) => {
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
  sendOk(res, projectId)
}
