import { hook } from '@/utils/hook-wrapper.js'
import { UnprocessableContentError } from '@/utils/errors.js'
import { addLogs } from '@/resources/queries-index.js'
import { getUsers as getUsersQuery } from '../queries.js'

export const getUsers = async () => {
  const users = await getUsersQuery()

  const results = await hook.user.retrieveAdminUsers()
  const adminIds: string[] = results.results.keycloak?.adminIds

  if (!adminIds?.length) return users.map(user => ({ ...user, isAdmin: false }))

  return users.map(user => ({ ...user, isAdmin: adminIds.includes(user.id) }))
}

export const updateUserAdminRole = async ({ userId, isAdmin }: { userId: string, isAdmin: boolean }, requestId: string) => {
  const results = await hook.user.updateUserAdminGroupMembership(userId, { isAdmin })

  await addLogs('Update User Admin Role', results, userId, requestId)

  if (results.failed) {
    throw new UnprocessableContentError('Echec des opérations')
  }
}
