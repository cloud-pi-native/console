import {
  addMember,
  listMembers,
  patchMembers,
  removeMember,
} from './business.js'
import { ProjectAuthorized, projectMemberContract } from '@cpn-console/shared'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { NotFound404, Forbidden403, ErrorResType } from '@/utils/errors.js'

export const projectMemberRouter = () => serverInstance.router(projectMemberContract, {
  listMembers: async ({ request: req, params }) => {
    const { projectId } = params
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!perms.projectPermissions) return new NotFound404()

    const body = await listMembers(projectId)

    return {
      status: 200,
      body,
    }
  },

  addMember: async ({ request: req, params, body }) => {
    const { projectId } = params
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!perms.projectPermissions && !ProjectAuthorized.ManageMembers(perms)) return new NotFound404()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const resBody = await addMember(projectId, body, perms.user.id, req.id, perms.projectOwnerId)
    if (resBody instanceof ErrorResType) return resBody

    return {
      status: 201,
      body: resBody,
    }
  },

  patchMembers: async ({ request: req, params, body }) => {
    const { projectId } = params
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })

    if (!perms.projectPermissions) return new NotFound404()
    if (!ProjectAuthorized.ManageMembers(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const resBody = await patchMembers(projectId, body)

    return {
      status: 200,
      body: resBody,
    }
  },

  removeMember: async ({ request: req, params }) => {
    const { projectId } = params
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!perms.projectPermissions) return new NotFound404()
    if (!ProjectAuthorized.ManageMembers(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const resBody = await removeMember(projectId, params.userId)

    return {
      status: 200,
      body: resBody,
    }
  },
})
