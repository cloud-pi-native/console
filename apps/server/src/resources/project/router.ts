import { addReqLogs } from '@/utils/logger.js'
import {
  getUserProjects,
  createProject,
  updateProject,
  archiveProject,
  getProjectSecrets,
  replayHooks,
} from './business.js'
import { projectContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const projectRouter = () => serverInstance.router(projectContract, {

  // Récupérer les projets d'un user
  getProjects: async ({ request: req }) => {
    try {
      const requestor = req.session.user
      const projectsInfos = await getUserProjects(requestor.id)

      addReqLogs({
        req,
        message: 'Projets de l\'utilisateur récupérés avec succès',
        infos: {
          userId: requestor.id,
        },
      })
      return {
        status: 200,
        body: projectsInfos,
      }
    } catch (error) {
      throw new Error(error.message)
    }
  },

  // Récupérer les secrets d'un projet
  getProjectSecrets: async ({ request: req, params }) => {
    const userId = req.session.user.id
    const projectId = params.projectId

    const projectSecrets = await getProjectSecrets(projectId, userId)

    addReqLogs({
      req,
      message: 'Secrets du projet récupérés avec succès',
      infos: {
        projectId,
        userId,
      },
    })
    return {
      status: 200,
      body: projectSecrets,
    }
  },

  // Créer un projet
  createProject: async ({ request: req, body: data }) => {
    const requestor = req.session.user
    // @ts-ignore
    delete requestor.groups

    const project = await createProject(data, requestor, req.id)

    addReqLogs({
      req,
      message: 'Projet créé avec succès',
      infos: {
        projectId: project.id,
      },
    })
    return {
      status: 201,
      body: project,
    }
  },

  // Mettre à jour un projet
  updateProject: async ({ request: req, params, body: data }) => {
    const requestor = req.session.user
    const projectId = params.projectId

    const project = await updateProject(data, projectId, requestor, req.id)
    addReqLogs({
      req,
      message: 'Projet mis à jour avec succès',
      infos: {
        projectId,
      },
    })
    return {
      status: 200,
      body: project,
    }
  },

  // Reprovisionner un projet
  replayHooksForProject: async ({ request: req, params }) => {
    const requestor = req.session.user
    const projectId = params.projectId

    await replayHooks(projectId, requestor, req.id)

    addReqLogs({
      req,
      message: 'Projet reprovisionné avec succès',
      infos: {
        projectId,
      },
    })
    return {
      status: 204,
      body: null,
    }
  },

  // Archiver un projet
  archiveProject: async ({ request: req, params }) => {
    const requestor = req.session.user
    const projectId = params.projectId

    await archiveProject(projectId, requestor, req.id)

    addReqLogs({
      req,
      message: 'Projet en cours de suppression',
      infos: {
        projectId,
      },
    })
    return {
      status: 204,
      body: null,
    }
  },
})
