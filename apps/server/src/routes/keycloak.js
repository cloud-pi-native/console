import { getUsersKeyCloakController } from '../controllers/keycloak-controller.js'

const router = async (app, _opt) => {
  await app.get('/', getUsersKeyCloakController)
}

export default router
