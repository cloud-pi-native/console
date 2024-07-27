import { addReqLogs } from '@/utils/logger.js'
import {
  createProject,
  updateProject,
  archiveProject,
  getProjectSecrets,
  replayHooks,
  listProjects,
  handleProjectLocking,
  generateProjectsData,
} from './business.js'
import { projectContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { assertIsAdmin } from '@/utils/controller.js'

export const projectRouter = () => serverInstance.router(projectContract, {

  // Récupérer des projets
  listProjects: async ({ request: req, query }) => {
    try {
      const user = req.session.user

      const allProjects = await listProjects(
        query,
        user,
      )

      addReqLogs({
        req,
        message: 'Ensemble des projets récupérés avec succès',
      })
      return {
        status: 200,
        body: allProjects,
      }
    }
    catch (error) {
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
  // Récupérer les données de tous les projets pour export
  getProjectsData: async ({ request: req }) => {
    assertIsAdmin(req.session.user)
    const generatedProjectsData = await generateProjectsData()

    addReqLogs({
      req,
      message: 'Données des projets rassemblées pour export',
    })
    return {
      status: 200,
      body: generatedProjectsData,
    }
  },

  // (Dé)verrouiller un projet
  patchProject: async ({ request: req, params, body: data }) => {
    assertIsAdmin(req.session.user)
    const projectId = params.projectId
    const lock = data.lock

    await handleProjectLocking(projectId, lock)

    addReqLogs({
      req,
      message: `Projet ${lock ? 'verrouillé' : 'déverrouillé'} avec succès`,
    })
    return {
      status: 200,
      body: null,
    }
  },
})
