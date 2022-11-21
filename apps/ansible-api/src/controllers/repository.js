import { getLogInfos } from '../utils/logger.js'
import { send200, send500 } from '../utils/response.js'
import app from '../app.js'
import { ansibleArgsDictionary, runPlaybook } from '../ansible.js'
import { convertVars } from '../utils/tools.js'
import { playbooksDictionary } from '../utils/matches.js'

export const createRepositoryController = async (req, res) => {
  const data = req.body

  let project
  try {
    const playbooks = playbooksDictionary.project
    const extraVars = convertVars(ansibleArgsDictionary, data)
    runPlaybook(playbooks, extraVars)

    send200(res, project)
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error: error.message,
    })
    send500(res, error.message)
  }
}
