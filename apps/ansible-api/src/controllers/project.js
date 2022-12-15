import { getLogInfos } from '../utils/logger.js'
import { send200, send500 } from '../utils/response.js'
import { runPlaybook } from '../ansible.js'
import { playbooksDictionary } from '../utils/matches.js'

export const createProjectController = async (req, res) => {
  const data = req.body

  try {
    const playbooks = playbooksDictionary.projects
    runPlaybook(playbooks, data)

    const message = 'Provisioning project with ansible started'
    req.log.info({
      ...getLogInfos(),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    const message = 'Provisioning project with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}
