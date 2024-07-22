import type { Project, User } from '@prisma/client'
import {
  addLogs,
  deleteMember,
  listMembers as listMembersQuery,
  upsertMember,
} from '@/resources/queries-index.js'
import { projectMemberContract, UserSchema, XOR } from '@cpn-console/shared'
import prisma from '@/prisma.js'
import { BadRequest400 } from '@/utils/controller.js'
import { hook } from '@/utils/hook-wrapper.js'
import { logUser } from '../user/business.js'

export const listMembers = async (projectId: Project['id']) => listMembersQuery(projectId)

export const addMember = async (projectId: Project['id'], user: XOR<{ userId: string }, { email: string }>, requestorId: User['id'], requestId: string, projectOwnerId: Project['ownerId']) => {
  let userInDb: User | undefined | null

  if (user.userId) {
    userInDb = await prisma.user.findUnique({ where: { id: user.userId } })
  } else if (user.email) {
    userInDb = await prisma.user.findUnique({ where: { email: user.email } })
  } else {
    return new BadRequest400('Veuillez spéecifiez au moins un userId ou un email')
  }
  if (userInDb) {
    if (userInDb.id === projectOwnerId) return new BadRequest400('Le owner ne peut pas être ajouté à cette liste')
  } else {
    const hookReply = await hook.user.retrieveUserByEmail(user.email)
    await addLogs('Retrieve User By Email', hookReply, requestorId, requestId)
    if (hookReply.failed) {
      throw new BadRequest400('Echec de la recherche auprès des services externes')
    }

    const retrievedUser = hookReply.results.keycloak?.user
    if (!retrievedUser) return new BadRequest400('Impossible de toruver l\'utilisateur en base ou sur keycloak')
    const userValidated = UserSchema.pick({ email: true, firstName: true, lastName: true, id: true }).safeParse(retrievedUser)
    if (!userValidated.success) return new BadRequest400('L\'utilisateur trouvé ne remplit pas les conditions de vérification')
    userInDb = await logUser({ ...userValidated.data, groups: [] })
  }

  await upsertMember({ projectId, userId: userInDb.id, roleIds: [] })
  return listMembers(projectId)
}

export const patchMembers = async (projectId: Project['id'], members: typeof projectMemberContract.patchMembers.body._type) => {
  for (const member of members) {
    await upsertMember({ projectId, userId: member.userId, roleIds: member.roles })
  }
  return listMembers(projectId)
}

export const removeMember = async (projectId: Project['id'], userId: User['id']) => {
  await deleteMember({ projectId, userId })
  return listMembers(projectId)
}
