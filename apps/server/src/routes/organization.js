import {
  getActiveOrganizationsController,
} from '../controllers/organization.js'

const router = async (app, _opt) => {
  await app.get('/', getActiveOrganizationsController)
}

export default router
