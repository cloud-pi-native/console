import { serverInstance } from '@/app.js'
import { AdminAuthorized, environmentContract, ProjectAuthorized } from '@cpn-console/shared'
import { createEnvironment, deleteEnvironment, updateEnvironment, getProjectEnvironments, checkEnvironmentInput } from './business.js'

import { authUser, NotFound404, Forbidden403, ErrorResType } from '@/utils/controller.js'

export const environmentRouter = () => serverInstance.router(environmentContract, {
  listEnvironments: async ({ request: req, query }) => {
    const projectId = query.projectId
    const user = req.session.user
    const perms = await authUser(user, { id: projectId })
    if (!ProjectAuthorized.ListEnvironments(perms)) return new NotFound404()

    const environments = await getProjectEnvironments(projectId)

    return {
      status: 200,
      body: environments,
    }
  },

  createEnvironment: async ({ request: req, body: data }) => {
    const projectId = data.projectId
    const requestor = req.session.user
    const perms = await authUser(requestor, { id: projectId })
    if (!perms.projectPermissions) return new NotFound404()
    if (!ProjectAuthorized.ManageEnvironments(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouilé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const allowPrivateQuota = AdminAuthorized.isAdmin(perms.adminPermissions)
    const allowInvalidQuotaStage = AdminAuthorized.isAdmin(perms.adminPermissions)
    const invalidReason = await checkEnvironmentInput({ allowPrivateQuota, allowInvalidQuotaStage, ...data })
    if (invalidReason) return invalidReason

    const body = await createEnvironment({
      userId: perms.user.id,
      projectId,
      name: data.name,
      clusterId: data.clusterId,
      quotaId: data.quotaId,
      stageId: data.stageId,
      requestId: req.id,
    })
    if (body instanceof ErrorResType) return body

    return {
      status: 201,
      body,
    }
  },

  updateEnvironment: async ({ request: req, body: data, params }) => {
    const { environmentId } = params
    const user = req.session.user
    const perms = await authUser(user, { environmentId })
    if (!ProjectAuthorized.ListEnvironments(perms)) return new NotFound404()
    if (!ProjectAuthorized.ManageEnvironments(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouilé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const allowPrivateQuota = AdminAuthorized.isAdmin(perms.adminPermissions)
    const allowInvalidQuotaStage = AdminAuthorized.isAdmin(perms.adminPermissions)
    const invalidReason = await checkEnvironmentInput({ allowPrivateQuota, allowInvalidQuotaStage, environmentId, ...data })
    if (invalidReason) return invalidReason

    const body = await updateEnvironment({
      user: perms.user,
      environmentId,
      quotaId: data.quotaId,
      requestId: req.id,
    })
    if (body instanceof ErrorResType) return body

    return {
      status: 200,
      body,
    }
  },

  deleteEnvironment: async ({ request: req, params }) => {
    const user = req.session.user
    const { environmentId } = params
    const perms = await authUser(user, { environmentId })
    if (!perms.projectPermissions) return new NotFound404()
    if (!ProjectAuthorized.ManageEnvironments(perms)) return new Forbidden403()
    if (perms.projectLocked) return new Forbidden403('Le projet est verrouilé')
    if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

    const body = await deleteEnvironment({
      userId: perms.user.id,
      environmentId,
      requestId: req.id,
      projectId: perms.projectId,
    })
    if (body instanceof ErrorResType) return body

    return {
      status: 204,
      body,
    }
  },
})
