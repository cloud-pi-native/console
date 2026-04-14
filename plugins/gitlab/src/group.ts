import { getClient } from './utils.js'

export async function deleteGroup(groupId: number, fullPath: string): Promise<unknown> {
  const api = getClient()
  await api.groupsRemove(groupId)
  return api.groupsRemove(groupId, { permanentlyRemove: true, fullPath: `${fullPath}-deletion_scheduled-${groupId}` })
}
