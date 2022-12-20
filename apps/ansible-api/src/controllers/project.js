import { getLogInfos } from '../utils/logger.js'
import { send201, send500 } from '../utils/response.js'
import { runPlaybook } from '../ansible.js'
import { playbooksDictionary } from '../utils/matches.js'

export const createProjectController = async (req, res) => {
  const data = req.body

  try {
    const playbooks = playbooksDictionary.projects
    await runPlaybook(playbooks, data)
    const message = 'Provisioning project with ansible started'

    send201(res, message)
    req.log.info({
      ...getLogInfos(),
      description: message,
    })
  } catch (error) {
    const message = 'Provisioning project with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    send500(res, message)
  }
}
