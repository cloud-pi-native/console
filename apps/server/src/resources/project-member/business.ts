import type { Project, User } from '@prisma/client'
import type { XOR, projectMemberContract } from '@cpn-console/shared'
import { UserSchema } from '@cpn-console/shared'
import { logViaSession } from '../user/business.js'
import {
  addLogs,
  deleteMember,
  listMembers as listMembersQuery,
  upsertMember,
} from '@/resources/queries-index.js'
import prisma from '@/prisma.js'
import { BadRequest400, NotFound404 } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

export const listMembers = async (projectId: Project['id']) => listMembersQuery(projectId)

export async function addMember(projectId: Project['id'], user: XOR<{ userId: string }, { email: string }>, requestorId: User['id'], requestId: string, projectOwnerId: Project['ownerId']) {
  let userInDb: User | undefined | null

  if (user.userId) {
    userInDb = await prisma.user.findUnique({ where: { id: user.userId, type: 'human' } })
  } else if (user.email) {
    userInDb = await prisma.user.findUnique({ where: { email: user.email, type: 'human' } })
  } else {
    return new BadRequest400('Veuillez spécifiez au moins un userId ou un email')
  }
  if (userInDb) {
    if (userInDb.id === projectOwnerId) return new BadRequest400('Le owner ne peut pas être ajouté à cette liste')
  } else if (user.email) {
    const hookReply = await hook.user.retrieveUserByEmail(user.email)
    await addLogs({ action: 'Retrieve User By Email', data: hookReply, userId: requestorId, requestId })
    if (hookReply.failed) {
      throw new BadRequest400('Echec de la recherche auprès des services externes')
    }

    const retrievedUser = hookReply.results.keycloak?.user
    if (!retrievedUser) return new BadRequest400('Utilisateur introuvable')
    const userValidated = UserSchema.pick({ email: true, firstName: true, lastName: true, id: true }).safeParse(retrievedUser)
    if (!userValidated.success) return new BadRequest400('L\'utilisateur trouvé ne remplit pas les conditions de vérification')
    const logResults = await logViaSession({ ...userValidated.data, groups: [] })
    userInDb = logResults.user
  } else {
    return new NotFound404()
  }

  await upsertMember({ projectId, userId: userInDb.id, roleIds: [] })
  await hook.projectMember.upsert(projectId, userInDb.id)
  return listMembers(projectId)
}

export async function patchMembers(projectId: Project['id'], members: typeof projectMemberContract.patchMembers.body._type) {
  for (const member of members) {
    await upsertMember({ projectId, userId: member.userId, roleIds: member.roles })
    await hook.projectMember.upsert(projectId, member.userId)
  }
  return listMembers(projectId)
}

export async function removeMember(projectId: Project['id'], userId: User['id']) {
  await hook.projectMember.delete(projectId, userId)
  await deleteMember({ projectId, userId })
  return listMembers(projectId)
}
