import {
  getAssociatedEnvironmentsController,
  createQuotaController,
  deleteQuotaController,
  updateQuotaStageController,
  updateQuotaPrivacyController,
} from '@/resources/quota/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer les environnements associés au quota
  await app.get('/:quotaId/environments', getAssociatedEnvironmentsController)

  // Créer un quota
  await app.post('/', createQuotaController)

  // Modifier la confidentialité d'un quota
  await app.patch('/:quotaId', updateQuotaPrivacyController)

  // Modifier une association quota / stage
  await app.put('/quotastages', updateQuotaStageController)

  // Supprimer un quota
  await app.delete('/:quotaId', deleteQuotaController)
}

export default router
