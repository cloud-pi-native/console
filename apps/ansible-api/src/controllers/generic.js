import { send200, send500 } from '../utils/response.js'
import { runPlaybook } from '../ansible.js'
import app from '../app.js'

export const controller = async (req, res) => {
  const data = req.body

  return runPlaybook(res.context.config.playbook, data).then(message => {
    message.id = req.id
    if (message.status === 'OK') {
      send200(res, message)
      return
    }
    send500(res, message)
  }).catch(message => {
    message.id = req.id
    app.log.error(`Unexpected Error occured: ${message}`)
  })
}
