import { getApi } from './utils.js'

export async function deleteGroup(groupId: number) {
  const api = getApi()
  return api.Groups.remove(groupId)
}
