import {
  getAllOrganizationsController,
  createOrganizationController,
  updateOrganizationController,
} from '../../controllers/admin/organizations.js'

const router = async (app, _opt) => {
  // Récupérer toutes les organisations
  await app.get('/', getAllOrganizationsController)

  // Créer une organisation
  await app.post('/', createOrganizationController)

  // Mettre à jour une organisation
  await app.put('/:orgName', updateOrganizationController)
}

export default router
