import { getLogInfos } from '../utils/logger.js'
import { send200, send500 } from '../utils/response.js'
import app from '../app.js'
import { ansibleArgsDictionary, runPlaybook } from '../ansible.js'
import { convertVars } from '../utils/tools.js'
import { playbooksDictionary } from '../utils/matches.js'

export const createProjectController = async (req, res) => {
  const data = req.body

  try {
    const playbooks = playbooksDictionary.projects
    console.log({ playbooks, req: req.body })
    const extraVars = convertVars(ansibleArgsDictionary, data)
    runPlaybook(playbooks, extraVars)

    send200(res, 'Provisioning project with ansible started')
  } catch (error) {
    app.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error: error.message,
    })
    send500(res, error.message)
  }
}
