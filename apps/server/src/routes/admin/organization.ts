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

  // Mettre à jour une organisation
  await app.put('/:orgName', updateOrganizationController)

  // Synchroniser les organisations via les plugins externes
  await app.put('/sync/organizations', fetchOrganizationsController)
}

export default router
