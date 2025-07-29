import { getApi } from './utils'

export async function deleteGroup(groupId: number, fullPath: string) {
  const api = getApi()
  await api.Groups.remove(groupId) // Marks for deletion
  return api.Groups.remove(groupId, { permanentlyRemove: true, fullPath }) // Effective deletion
}
