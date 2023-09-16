import { StepCall } from '@/plugins/hooks/hook.js'
import { localClient } from './api.js'

export const purgeAll: StepCall<object> = async () => {
  const namespaces = await localClient.listNamespace(undefined, undefined, undefined, undefined, 'dso/organization')
  for (const ns of namespaces.body.items) {
    await localClient.deleteNamespace(ns.metadata.name)
  }
  return {
    status: {
      result: 'OK',
      message: 'Namespaces deleted',
    },
  }
}
