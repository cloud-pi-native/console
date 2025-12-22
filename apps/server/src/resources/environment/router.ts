import { ProjectAuthorized, environmentContract } from '@cpn-console/shared'
import { checkEnvironmentCreate, checkEnvironmentUpdate, createEnvironment, deleteEnvironment, getProjectEnvironments, updateEnvironment } from './business.js'
import { serverInstance } from '@/app.js'
import { authUser } from '@/utils/controller.js'
import { BadRequest400, Forbidden403, Internal500, NotFound404, Unauthorized401 } from '@/utils/errors.js'

export function environmentRouter() {
  return serverInstance.router(environmentContract, {
    listEnvironments: async ({ request: req, query }) => {
      const projectId = query.projectId
      const perms = await authUser(req, { id: projectId })

      const environments = ProjectAuthorized.ListEnvironments(perms)
        ? await getProjectEnvironments(projectId)
        : []

      return {
        status: 200,
        body: environments,
      }
    },

    createEnvironment: async ({ request: req, body: requestBody }) => {
      const projectId = requestBody.projectId
      const perms = await authUser(req, { id: projectId })

      if (!perms.user) return new Unauthorized401('Require to be requested from user not api key')
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.ManageEnvironments(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const checkCreateResult = await checkEnvironmentCreate({ ...requestBody })
      if (checkCreateResult.isError) return new BadRequest400(checkCreateResult.error)

      const result = await createEnvironment({
        userId: perms.user.id,
        projectId,
        name: requestBody.name,
        clusterId: requestBody.clusterId,
        cpu: requestBody.cpu,
        gpu: requestBody.gpu,
        memory: requestBody.memory,
        autosync: requestBody.autosync,
        stageId: requestBody.stageId,
        requestId: req.id,
      })
      if (result.isError) {
        return new Internal500(result.error)
      }
      return {
        status: 201,
        body: result.data,
      }
    },

    updateEnvironment: async ({ request: req, body: requestBody, params }) => {
      const { environmentId } = params
      const perms = await authUser(req, { environmentId })
      if (!perms.user) return new Unauthorized401('Require to be requested from user not api key')
      if (!ProjectAuthorized.ListEnvironments(perms)) return new NotFound404()
      if (!ProjectAuthorized.ManageEnvironments(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const checkUpdateResult = await checkEnvironmentUpdate({ environmentId, ...requestBody })
      if (checkUpdateResult.isError) return new BadRequest400(checkUpdateResult.error)

      const result = await updateEnvironment({
        user: perms.user,
        environmentId,
        cpu: requestBody.cpu,
        gpu: requestBody.gpu,
        memory: requestBody.memory,
        autosync: requestBody.autosync,
        requestId: req.id,
      })
      if (result.isError) {
        return new Internal500(result.error)
      }
      return {
        status: 200,
        body: result.data,
      }
    },

    deleteEnvironment: async ({ request: req, params }) => {
      const { environmentId } = params
      const perms = await authUser(req, { environmentId })
      if (!perms.projectPermissions) return new NotFound404()
      if (!ProjectAuthorized.ManageEnvironments(perms)) return new Forbidden403()
      if (perms.projectLocked) return new Forbidden403('Le projet est verrouillé')
      if (perms.projectStatus === 'archived') return new Forbidden403('Le projet est archivé')

      const result = await deleteEnvironment({
        userId: perms.user?.id,
        environmentId,
        requestId: req.id,
        projectId: perms.projectId,
      })
      if (result.isError) {
        return new Internal500(result.error)
      }

      return {
        status: 204,
        body: result.data,
      }
    },
  })
}
