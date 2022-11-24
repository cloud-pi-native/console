import { getLogInfos } from '../utils/logger.js'
import { send200, send500 } from '../utils/response.js'
import app from '../app.js'
import { ansibleArgsDictionary, runPlaybook } from '../ansible.js'
import { convertVars } from '../utils/tools.js'
import { playbooksDictionary } from '../utils/matches.js'

export const createRepositoryController = async (req, res) => {
  const data = req.body

  try {
    const playbooks = playbooksDictionary.repos
    const { env } = data
    const extraVars = convertVars(ansibleArgsDictionary, data)
    runPlaybook(playbooks, extraVars, env)

    const message = 'Provisioning repos in project with ansible started'
    app.log.error({
      ...getLogInfos(),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    const message = 'Provisioning repos in project with ansible failed'
    app.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}
