import { addReqLogs } from '@/utils/logger.js'
import {
  handleProjectLocking,
  generateProjectsData,
} from './business.js'
import { projectAdminContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'

export const projectAdminRouter = () => serverInstance.router(projectAdminContract, {
  // Récupérer les données de tous les projets pour export
  getProjectsData: async ({ request: req }) => {
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
