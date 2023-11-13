import {
  updateQuotaStageController,
} from '@/resources/quota/admin/controllers.js'

import {
  getStageAssociatedEnvironmentsController,
  createStageController,
  deleteStageController,
  updateStageClustersController,
} from '@/resources/stage/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer les environnements associés au stage
  await app.get('/:stageId/environments', getStageAssociatedEnvironmentsController)

  // Créer un stage
  await app.post('/', createStageController)

  // Modifier une association quota / stage
  await app.put('/quotastages', updateQuotaStageController)

  // Modifier une association stage / clusters
  await app.patch('/:stageId/clusters', updateStageClustersController)

  // Supprimer un stage
  await app.delete('/:stageId', deleteStageController)
}

export default router
