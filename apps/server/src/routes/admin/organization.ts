import {
  getAllOrganizationsController,
  createOrganizationController,
  updateOrganizationController,
  fetchOrganizationsController,
} from '@/resources/organization/admin/controllers.js'

const router = async (app, _opt) => {
  // Récupérer toutes les organisations
  await app.get('/', getAllOrganizationsController)

  // Créer une organisation
  await app.post('/', createOrganizationController)

  // Synchroniser les organisations via les plugins externes
  await app.put('/sync', fetchOrganizationsController)

  // Mettre à jour une organisation
  await app.put('/:orgName', updateOrganizationController)
}

export default router
