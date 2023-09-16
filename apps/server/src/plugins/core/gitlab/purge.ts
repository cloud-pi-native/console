import { StepCall } from '@/plugins/hooks/hook.js'
import { api, getGroupRootId } from './utils.js'

export const purgeAll: StepCall<object> = async () => {
  const rootId = await getGroupRootId()
  const allGroups = await api.Groups.allSubgroups(rootId)
  for (const group of allGroups) {
    api.Groups.remove(group.id)
  }
  return {
    status: {
      result: 'OK',
      message: 'Gitlab groups deleted',
    },
  }
}
