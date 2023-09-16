import { StepCall } from '@/plugins/hooks/hook.js'
import { getkcClient } from './client.js'

export const purgeAll: StepCall<object> = async () => {
  const kcClient = await getkcClient()
  const allGroups = await kcClient.groups.find()

  for (const group of allGroups) {
    kcClient.groups.del({ id: group.id })
  }
  return {
    status: {
      result: 'OK',
      message: 'Keycloak groups deleted',
    },
  }
}
