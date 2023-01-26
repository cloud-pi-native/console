import {
  projectLocked,
  projectUnlocked,
} from '../models/queries/project-queries.js'

import { ansibleHost, ansiblePort } from '../utils/env.js'

export const ansibleConnector = async ({ payload, route, method, initQuery, initQueryParams, okQuery, okQueryParams, nokQuery, nokQueryParams, lockProjectId }) => {
  await initQuery(initQueryParams)
  await projectLocked(lockProjectId)
  try {
    await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/${route}`, {
      method,
      body: payload,
      headers: {
        'Content-Type': 'application/json',
        // authorization: req.headers.authorization,
      },
    })
    await okQuery(okQueryParams)
  } catch {
    await nokQuery(nokQueryParams)
  }
  await projectUnlocked(lockProjectId)
}
// j'ai perdu webconf

// const userId = req.session?.user.id
// const projectId = req.params?.projectId

// try {
//   const project = await getProjectById(projectId)
//   if (!project) throw new Error('Project not found')

//   const role = await getRoleByUserIdAndProjectId(userId, projectId)
//   if (!role) throw new Error('Requestor is not member of project')
//   if (role !== 'owner') throw new Error('Requestor is not owner of project')

//  await projectArchiving(projectId)
//  req.log.info({
//    ...getLogInfos({
//      projectId,
//    }),
//    description: 'Project successfully archived in database',
//  })
//  send200(res, projectId)
// }
//  catch (error) {
//  req.log.error({
//    ...getLogInfos(),
//    description: `Cannot archive project: ${error.message}`,
//    error: error.message,
//  })
//  return send500(res, error.message)
// }

// try {
//  // TODO : US #130 appel ansible
//  try {
//    await projectUnlocked(projectId)

//    req.log.info({
//      ...getLogInfos({ projectId }),
//      description: 'Project archived and unlocked',
//    })
//  } catch (error) {
//    req.log.error({
//      ...getLogInfos(),
//      description: 'Cannot unlock project',
//      error: error.message,
//    })
//  }
// }
//  catch (error) {
//  req.log.error({
//    ...getLogInfos(),
//    description: 'Provisioning project with ansible failed',
//    error,
//  })
//  try {
//    await projectFailed(projectId)
//    await projectUnlocked(projectId)

//    req.log.info({
//      ...getLogInfos({ projectId }),
//      description: 'Project status successfully updated in database',
//    })
//  } catch (error) {
//    req.log.error({
//      ...getLogInfos(),
//      description: 'Cannot update project status',
//      error: error.message,
//    })
//  }
//  send500(res, error)
// }
