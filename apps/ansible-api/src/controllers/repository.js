import { getLogInfos } from '../utils/logger.js'
import { send200, send500 } from '../utils/response.js'
import { runPlaybook } from '../ansible.js'
import { playbooksDictionary } from '../utils/matches.js'

export const createRepositoryController = async (req, res) => {
  const data = req.body

  try {
    const playbooks = playbooksDictionary.repos
    runPlaybook(playbooks, data)

    const message = 'Provisioning repos in project with ansible started'
    req.log.info({
      ...getLogInfos(),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    const message = 'Provisioning repos in project with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error,
    })
    send500(res, message)
  }
}
